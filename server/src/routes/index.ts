import { Application } from 'express';
import { userRoute } from '../components/User/v1/index.js';
import { productRoute } from '../components/Product/v1/index.js';
import { orderRoute } from '../components/Order/v1/index.js';
import { soilRoute } from '../components/Soil/v1/index.js';
import { predictionRoute } from '../components/Prediction/v1/index.js';
import { chatRoute } from '../components/Chat/v1/index.js';
import { adminRoute } from '../components/Admin/v1/index.js';
import { uploadRoute } from '../components/Upload/v1/index.js';
import { farmRoute } from '../components/Farm/v1/index.js';

export default (app: Application) => {
  app.use('/api/auth', userRoute);
  app.use('/api/products', productRoute);
  app.use('/api/orders', orderRoute);
  app.use('/api/soil', soilRoute);
  app.use('/api/predictions', predictionRoute);
  app.use('/api/chat', chatRoute);
  app.use('/api/admin', adminRoute);
  app.use('/api/upload', uploadRoute);
  app.use('/api/farms', farmRoute);
};
