
import React, { useState, useEffect } from 'react';
import { cartAPI } from '../api';

const Cart = () => {
  const [cart, setCart] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const cartData = await cartAPI.get();
      setCart(cartData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQuantity = async (productId, quantity) => {
    try {
      const updatedCart = await cartAPI.update(productId, quantity);
      setCart(updatedCart);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveItem = async (productId) => {
    try {
      const updatedCart = await cartAPI.remove(productId);
      setCart(updatedCart);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClearCart = async () => {
    try {
      const updatedCart = await cartAPI.clear();
      setCart(updatedCart);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div>Loading cart...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!cart || cart.items.length === 0) {
    return <div>Your cart is empty.</div>;
  }

  return (
    <div className="cart-container">
      <h2>Your Cart</h2>
      <div className="cart-items">
        {cart.items.map((item) => (
          <div key={item.id} className="cart-item">
            <div className="item-details">
              <p>{item.product.name}</p>
              <p>Price: ${(item.product.price_cents / 100).toFixed(2)}</p>
            </div>
            <div className="item-actions">
              <button
                onClick={() =>
                  handleUpdateQuantity(item.product.id, item.quantity - 1)
                }
              >
                -
              </button>
              <span>{item.quantity}</span>
              <button
                onClick={() =>
                  handleUpdateQuantity(item.product.id, item.quantity + 1)
                }
              >
                +
              </button>
              <button onClick={() => handleRemoveItem(item.product.id)}>
                Remove
              </button>
            </div>
            <div className="item-subtotal">
              Subtotal: ${(
                (item.product.price_cents * item.quantity) /
                100
              ).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
      <div className="cart-summary">
        <p>Total Items: {cart.totalItems}</p>
        <p>Total Price: ${(cart.totalPrice / 100).toFixed(2)}</p>
        <button onClick={handleClearCart}>Clear Cart</button>
      </div>
      <style>{`
        .cart-container {
          border: 1px solid #ccc;
          padding: 20px;
          margin: 20px;
          border-radius: 5px;
        }
        .cart-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #eee;
          padding: 10px 0;
        }
        .item-details {
          flex-grow: 1;
        }
        .item-actions button {
          margin: 0 5px;
        }
        .cart-summary {
          margin-top: 20px;
          text-align: right;
        }
      `}</style>
    </div>
  );
};

export default Cart;
