const express = require("express");
const router = express.Router();
const Stripe_Key = "sk_test_...jQb";
const stripe = require("stripe")(Stripe_Key);
const customerId = "cus_IDxx...XTO";

router.get("/", (req, res) => {
  res.status(200).json({
    message: "Stripe Hello World!",
  });
});

// Create a new customer for stripe
router.post("/newCustomer", async (req, res) => {
  console.log("\n\n Body Passed:", req.body);
  try {
    const customer = await stripe.customers.create(
      {
        email: req.body.email,
      }
      // {
      //   // If you are using your own api then you can add your organization account here. So it will link the customer with your organization
      //   stripeAccount: process.env.StripeAccountId,
      //}
    );
    return res.status(200).send({
      //   customerDetails: customer,
      customerId: customer.id,
      customerEmail: customer.email,
    });
  } catch (error) {
    return res.status(400).send({ Error: error.raw.message });
  }
});

// Add a new card of the customer
router.post("/addNewCard", async (req, res) => {
  console.log("\n\n Body Passed:", req.body);
  const {
    cardNumber,
    cardExpMonth,
    cardExpYear,
    cardCVC,
    cardName,
    country,
    postal_code,
  } = req.body;

  if (!cardNumber || !cardExpMonth || !cardExpYear || !cardCVC) {
    return res.status(400).send({
      Error: "Please Provide All Necessary Details to save the card",
    });
  }
  try {
    const cardToken = await stripe.tokens.create({
      card: {
        name: cardName,
        number: cardNumber,
        exp_month: cardExpMonth,
        exp_year: cardExpYear,
        cvc: cardCVC,
        address_country: country,
        address_zip: postal_code,
      },
      // customer: customer.stripe_id,
      // stripe_account: StripeAccountId,
    });

    const card = await stripe.customers.createSource(customerId, {
      source: `${cardToken.id}`,
    });

    return res.status(200).send({
      card: card.id,
    });
  } catch (error) {
    return res.status(400).send({
      Error: error.raw.message,
    });
  }
});

// Get List of all saved card of the customers
router.get("/viewAllCards", async (req, res) => {
  let cards = [];
  try {
    const savedCards = await stripe.customers.listSources(customerId, {
      object: "card",
    });
    const cardDetails = Object.values(savedCards.data);

    cardDetails.forEach((cardData) => {
      let obj = {
        cardId: cardData.id,
        cardType: cardData.brand,
        cardExpDetails: `${cardData.exp_month}/${cardData.exp_year}`,
        cardLast4: cardData.last4,
      };
      cards.push(obj);
    });
    return res.status(200).send({
      cardDetails: cards,
    });
  } catch (error) {
    return res.status(400).send({
      Error: error.raw.message,
    });
  }
});

// Update saved card details of the customer
router.post("/updateCardDetails", async (req, res) => {
  const { cardName, cardExpMonth, cardExpYear, cardId } = req.body;

  if (!cardId) {
    return res.status(400).send({
      Error: "CardID is Required to update",
    });
  }
  try {
    const card = await stripe.customers.updateSource(customerId, cardId, {
      name: cardName,
      exp_month: cardExpMonth,
      exp_year: cardExpYear,
    });
    return res.status(200).send({
      updatedCard: card,
    });
  } catch (error) {
    return res.status(400).send({
      Error: error.raw.message,
    });
  }
});

// Delete a saved card of the customer
router.post("/deleteCard", async (req, res) => {
  console.log("\n\n Body Passed:", req.body);
  const { cardId } = req.body;
  if (!cardId) {
    return res.status(400).send({
      Error: "CardId is required to delete Card",
    });
  }
  try {
    const deleteCard = await stripe.customers.deleteSource(customerId, cardId);
    return res.status(200).send(deleteCard);
  } catch (error) {
    return res.status(400).send({
      Error: error.raw.message,
    });
  }
});

// Create a payment charge
router.post("/createCharge", async (req, res) => {
  console.log("\n\n Body Passed:", req.body);
  const { amount, cardId, oneTime, email } = req.body;
  if (oneTime) {
    const {
      cardNumber,
      cardExpMonth,
      cardExpYear,
      cardCVC,
      country,
      postalCode,
    } = req.body;

    if (!cardNumber || !cardExpMonth || !cardExpYear || !cardCVC) {
      return res.status(400).send({
        Error: "Necessary Card Details are required for One Time Payment",
      });
    }
    try {
      const cardToken = await stripe.tokens.create({
        card: {
          number: cardNumber,
          exp_month: cardExpMonth,
          exp_year: cardExpYear,
          cvc: cardCVC,
          address_state: country,
          address_zip: postalCode,
        },
      });

      const charge = await stripe.charges.create({
        amount: amount,
        currency: "usd",
        source: cardToken.id,
        receipt_email: email,
        description: `Stripe Charge Of Amount ${amount} for One Time Payment`,
      });

      if (charge.status === "succeeded") {
        return res.status(200).send({ Success: charge });
      } else {
        return res
          .status(400)
          .send({ Error: "Please try again later for One Time Payment" });
      }
    } catch (error) {
      return res.status(400).send({
        Error: error.raw.message,
      });
    }
  } else {
    try {
      const createCharge = await stripe.charges.create({
        amount: amount,
        currency: "usd",
        receipt_email: email,
        customer: customerId,
        card: cardId,
        description: `Stripe Charge Of Amount ${amount} for Payment`,
      });
      console.log("\n\n Start 2");
      if (createCharge.status === "succeeded") {
        return res.status(200).send({ Success: createCharge });
      } else {
        return res
          .status(400)
          .send({ Error: "Please try again later for payment" });
      }
    } catch (error) {
      return res.status(400).send({
        Error: error,
      });
    }
  }
});

module.exports = router;
