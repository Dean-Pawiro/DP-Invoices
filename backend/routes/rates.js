const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const router = express.Router();

const CME_URL = "https://www.cme.sr/";
const CME_RATES_ENDPOINT = "https://www.cme.sr/Home/GetTodaysExchangeRates/?BusinessDate=2016-07-25";

router.get("/cme", async (req, res) => {
  try {
    const apiResponse = await axios.post(CME_RATES_ENDPOINT, null, {
      timeout: 10000,
      headers: {
        "User-Agent": "invoice-app/1.0",
        "X-Requested-With": "XMLHttpRequest"
      }
    });

    const apiData = Array.isArray(apiResponse.data) ? apiResponse.data[0] : apiResponse.data;

    if (apiData && apiData.SaleUsdExchangeRate != null && apiData.SaleEuroExchangeRate != null) {
      return res.json({
        usd: Number(apiData.SaleUsdExchangeRate).toFixed(2),
        eur: Number(apiData.SaleEuroExchangeRate).toFixed(2),
        source: "CME",
        type: "We Sell",
        businessDate: apiData.BusinessDate || null,
        updatedTime: apiData.UpdatedTime || null
      });
    }

    const htmlResponse = await axios.get(CME_URL, {
      timeout: 10000,
      headers: {
        "User-Agent": "invoice-app/1.0"
      }
    });

    const $ = cheerio.load(htmlResponse.data);

    const saleUsd = $("#SaleUSDRate").first().text().trim();
    const saleEuro = $("#SaleEURORate").first().text().trim();

    if (!saleUsd || !saleEuro) {
      return res.status(502).json({
        message: "Failed to parse CME rates"
      });
    }

    return res.json({
      usd: saleUsd,
      eur: saleEuro,
      source: "CME",
      type: "We Sell"
    });
  } catch (error) {
    console.error("Failed to fetch CME rates:", error.message || error);
    return res.status(502).json({
      message: "Failed to fetch CME rates"
    });
  }
});

module.exports = router;
