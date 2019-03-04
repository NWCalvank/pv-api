import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const ielvClient = axios.create({
  baseURL: process.env.IELV_API_BASE_URL,
});

export const myVRClient = axios.create({
  baseURL: process.env.MY_VR_API_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.MY_VR_API_KEY}`,
  },
});
