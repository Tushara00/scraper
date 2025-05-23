"use server"

import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractCurrency, extractDescription, extractPrice } from '../utils';

export async function scrapeAmazonProduct(url?: string) {
    if (!url) return;

    const username = String(process.env.BRIGHT_DATA_USERNAME);
    const password = String(process.env.BRIGHT_DATA_PASSWORD);
    const port = 33335;
    const session_id = (1000000 * Math.random()) | 0;

    const options = {
        auth: {
            username: `${username}.session-${session_id}`,
            password,
        },
        host: 'brd.superproxy.io',
        port,
        rejectUnauthorized: false,
       
    };

    try {
       const response = await axios.get(url, options);
       const $ = cheerio.load(response.data);

        // Extract the product details
        const title = $('#productTitle').text().trim();
        const currentPrice = extractPrice(
              $('.priceToPay span.a-price-whole'),
              $('.a.size.base.a-color-price'),
              $('.a-button-selected .a-color-base'),
        );
       const originalPrice = extractPrice(
              $('#priceblock_ourprice'),
      $('.a-price.a-text-price span.a-offscreen'),
      $('#listPrice'),
      $('#priceblock_dealprice'),
      $('.a-size-base.a-color-price')
       )

       const outOfStock = $('#availability span').text(). trim().toLowerCase() === 'currently unavailable'

       const images = $('#imgBlkFront').attr('data-a-dynamic-image') ||
       $('#landingImage').attr('data-a-dynamic-image');
       const imageUrls = images ? Object.keys(JSON.parse(images)) : [];
const currency = extractCurrency($('.a-price-symbol'));
const discountRate = $('.savingsPercentage').text().replace(/[-%]/g,"")
const description = extractDescription($)
        console.log({title, currentPrice,  originalPrice,outOfStock,images,currency,discountRate });
//construct data object with scraped information
const data = {
    url,
    currency:currency ||'$',
    image:imageUrls[0] || '',
    title: title || 'No title',
    currentPrice: Number(currentPrice) || 0,
    originalPrice: Number(originalPrice) || Number(currentPrice) || 0,
  
    discountRate: Number(discountRate) || 0,
    priceHistory: [],
    category:'category',
    reviewsCount:100,
    stars:4.5,
    isOutOfStock: outOfStock,
 description,
    lowestPrice: Number(currentPrice) || Number(originalPrice),
    highestPrice: Number(originalPrice) || Number(currentPrice),
    averagePrice: Number(currentPrice) || Number(originalPrice),
}
return data;

    } catch (error: any) {
        throw new Error(`Failed to scrape product: ${error.message}`);
    }
}
