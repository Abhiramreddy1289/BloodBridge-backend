import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    pid: { type: String, required: true, unique: true },
    productName: { type: String, required: true },
    price: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;
