import dotenv from 'dotenv';

dotenv.config();

export default function(req, res) {
  const authToken = req.header('Authorization');
  if (authToken !== process.env.API_KEY) {
    res.send({ status: 401, status_message: 'Unauthorized Request' });
  }
  res.send({ status: 200, message: 'Successful request' });
}
