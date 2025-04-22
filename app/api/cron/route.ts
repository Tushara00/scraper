import { scrapeAndStoreProduct } from "@/lib/actions";
import Product from "@/lib/models/product.model";
import { connectToDB } from "@/lib/mongoose";
import { generateEmailBody, sendEmail } from "@/lib/nodemailer";
import { scrapeAmazonProduct } from "@/lib/scraper";
import {
  getAveragePrice,
  getEmailNotifType,
  getHighestPrice,
  getLowestPrice,
} from "@/lib/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const maxDuration = 60; 
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  // 🔐 Token check
  if (token !== process.env.CRON_SECRET) {
    return new NextResponse("Unauthorized nnjjj", { status: 401 });
  }

  try {
    await connectToDB();

    const products = await Product.find({});
    if (!products) throw new Error("NO products found");

    const updatedProducts = await Promise.all(
      products.map(async (currentProduct) => {
        const scrapeProduct = await scrapeAmazonProduct(currentProduct.url);
        if (!scrapeProduct) throw new Error("No product found");

        const updatedPriceHistory = [
          ...currentProduct.priceHistory,
          { price: scrapeProduct.currentPrice },
        ];

        const product = {
          ...scrapeProduct,
          priceHistory: updatedPriceHistory,
          lowestPrice: getLowestPrice(updatedPriceHistory),
          highestPrice: getHighestPrice(updatedPriceHistory),
          averagePrice: getAveragePrice(updatedPriceHistory),
        };

        const updatedProduct = await Product.findOneAndUpdate(
          { url: scrapeProduct.url },
          product,
          { new: true }
        );

        // Send email if needed
        const emailNotifType = getEmailNotifType(scrapeProduct, currentProduct);
        if (emailNotifType && updatedProduct?.users?.length > 0) {
          const productInfo = {
            title: updatedProduct.title,
            url: updatedProduct.url,
          };

          const emailContent = await generateEmailBody(productInfo, emailNotifType);
          const userEmails = updatedProduct.users.map((user: any) => user.email);

          await sendEmail(emailContent, userEmails);
        }

        return updatedProduct;
      })
    );

    return NextResponse.json({
      message: "Cron job ran successfully.",
      data: updatedProducts,
    });
  } catch (error) {
    return new NextResponse(`Error in cron job: ${error}`, { status: 500 });
  }
}


