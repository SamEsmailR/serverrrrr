import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    ip: '',
    username: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/login', formData);
      if (response.data.status === 'success') {
        console.log('Login successful');
        sessionStorage.setItem('isAuthenticated', 'true'); // Set the flag
        navigate('/dashboard'); // Redirect to Dashboard
      } else {
        console.error('Login failed:', response.data.error);
      }
      
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        IP:
        <input type="text" name="ip" value={formData.ip} onChange={handleChange} />
      </label>
      <label>
        Username:
        <input type="text" name="username" value={formData.username} onChange={handleChange} />
      </label>
      <label>
        Password:
        <input type="password" name="password" value={formData.password} onChange={handleChange} />
      </label>
      <button type="submit">Login</button>
    </form>
  );
}

export default Login;
