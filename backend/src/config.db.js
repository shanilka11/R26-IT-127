import mongoose from "mongoose";

export const connectDb = async (uri) => {
  await mongoose.connect(uri);
  console.log("MongoDB connected");
};
