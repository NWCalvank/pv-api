import axios from 'axios';
import dotenv from 'dotenv';

const axiosInstance = axios.create({
  baseURL: process.env.API_BASE_URL,
});

export default axiosInstance;
