import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const ielvClient = axios.create({
  baseURL: process.env.IELV_API_BASE_URL,
});
