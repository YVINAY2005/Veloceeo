
import prisma from '../../lib/prisma';
import AppError from '../../utils/AppError';

export interface CartItem {
  product_id: number;
  product: {
    id: number;
    name: string;
    price_cents: number;
    image?: string | null;
  };
  quantity: number;
  price_cents: number;
  total_cents: number;
}

const getCartByCustomerId = async (customerId: number) => {
  let cart = await prisma.cart.findUnique({
    where: { customer_id: customerId },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: {
                where: { is_primary: true },
                take: 1
              }
            }
          },
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        customer_id: customerId,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  where: { is_primary: true },
                  take: 1
                }
              }
            },
          },
        },
      },
    });
  }

  const items = cart.items.map((item: any) => ({
    id: item.id,
    product_id: item.product_id,
    product: {
      id: item.product.id,
      name: item.product.name,
      price_cents: item.product.price_cents,
      image: item.product.images?.[0]?.url || null,
    },
    quantity: item.quantity,
    price_cents: item.product.price_cents,
    total_cents: item.quantity * item.product.price_cents,
  }));

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const totalCents = items.reduce((total, item) => total + item.total_cents, 0);

  return {
    ...cart,
    items,
    totalItems,
    totalPrice: totalCents,
  };
};

const addItemToCart = async (
  customerId: number,
  productId: number,
  quantity: number
) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (product.stock_quantity < quantity) {
    throw new AppError('Not enough stock', 400);
  }

  let cart = await prisma.cart.findUnique({
    where: { customer_id: customerId },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        customer_id: customerId,
      },
    });
  }

  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cart_id_product_id: {
        cart_id: cart.id,
        product_id: productId,
      },
    },
  });

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (product.stock_quantity < newQuantity) {
      throw new AppError('Not enough stock', 400);
    }
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQuantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cart_id: cart.id,
        product_id: productId,
        quantity: quantity,
      },
    });
  }

  return getCartByCustomerId(customerId);
};

const updateItemQuantity = async (
  customerId: number,
  productId: number,
  quantity: number
) => {
  if (quantity < 0) {
    throw new AppError('Quantity cannot be negative', 400);
  }

  const cart = await prisma.cart.findUnique({
    where: { customer_id: customerId },
  });

  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cart_id_product_id: {
        cart_id: cart.id,
        product_id: productId,
      },
    },
  });

  if (!existingItem) {
    throw new AppError('Item not found in cart', 404);
  }

  if (quantity === 0) {
    await prisma.cartItem.delete({
      where: { id: existingItem.id },
    });
  } else {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new AppError('Product not found', 404);

    if (product.stock_quantity < quantity) {
      throw new AppError('Not enough stock', 400);
    }

    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity },
    });
  }

  return getCartByCustomerId(customerId);
};

const removeItemFromCart = async (customerId: number, productId: number) => {
  const cart = await prisma.cart.findUnique({
    where: { customer_id: customerId },
  });

  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cart_id_product_id: {
        cart_id: cart.id,
        product_id: productId,
      },
    },
  });

  if (!existingItem) {
    throw new AppError('Item not found in cart', 404);
  }

  await prisma.cartItem.delete({
    where: { id: existingItem.id },
  });

  return getCartByCustomerId(customerId);
};

const clearCart = async (customerId: number) => {
  const cart = await prisma.cart.findUnique({
    where: { customer_id: customerId },
  });

  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  await prisma.cartItem.deleteMany({
    where: { cart_id: cart.id },
  });

  return getCartByCustomerId(customerId);
};

export const cartService = {
  getCartByCustomerId,
  addItemToCart,
  updateItemQuantity,
  removeItemFromCart,
  clearCart,
};
