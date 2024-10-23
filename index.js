const express = require('express');
const Stripe = require('stripe')('sk_test_51Q6Fux1AQOYBeTYYhBdv6KgSrRWDmgTylAVet75TXllC30S8YgOY7EqoIrvPQwIfHV6T2lfknHD1RZTyGimhdLHF00Yw4DeBUG');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.post('/create-payment-intent', async (req, res) => {
    const { amount } = req.body;

    try {
        const paymentIntent = await Stripe.paymentIntents.create({
            amount: amount, // Convert to smallest currency unit
            currency: 'usd',
        });

        res.send({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).send({ error: error.message });
    }
});

// const PORT = process.env.PORT || 500;
app.listen(500, () => {
    // console.log(`Server is running on port ${PORT}`);
});
module.exports = app;
