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

export const gcpClient = axios.create({
  // TODO: Add this to .env
  baseURL: 'http://localhost:8080', // process.env.GCP_BASE_URL,
  headers: {
    Authorization: process.env.MY_VR_API_KEY,
  },
});
