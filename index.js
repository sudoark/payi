const express = require('express');
const pdfMake = require('pdfmake');
const path = require('path');
const fs = require('fs');
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Define fonts
const fonts = {
    Roboto: {
        normal: path.resolve('../node_modules/pdfmake/Roboto-Regular.ttf'),
        bold: path.resolve('../node_modules/pdfmake/Roboto-Medium.ttf'),
        italics: path.resolve('../node_modules/pdfmake/Roboto-Italic.ttf'),
        bolditalics: path.resolve('../node_modules/pdfmake/Roboto-MediumItalic.ttf')
    }
};

const printer = new pdfMake(fonts);

app.post('/generate-pdf', (req, res) => {
    const data = req.body; // Get data from the POST request body

    if (!data.transactions || !data.balance) {
        return res.status(400).send('Missing required data');
    }

    // Define document structure
    const documentDefinition = {
        content: [
            {
                columns: [
                    { image: '../assets/logo.jpg', width: 50 }, // Use absolute path for image
                    { text: 'MSV Public School Rambha', style: 'orgName', alignment: 'center' },
                    ''
                ],
                margin: [0, 0, 0, 20]
            },
            { text: `Transactions for ${data.person.name}`, style: 'header' },
            { text: `Mobile: ${data.person.mobile}`, margin: [0, 0, 0, 20] },
            {
                table: {
                    headerRows: 1,
                    widths: ['20%', '30%', '15%', '15%', '20%'],
                    body: [
                        [
                            { text: 'Date', bold: true },
                            { text: 'Description', bold: true },
                            { text: 'Credit', bold: true },
                            { text: 'Debit', bold: true },
                            { text: 'Balance', bold: true }
                        ],
                        ...data.transactions.map((transaction, index) => {
                            const credit = transaction.type === 'credit' ? transaction.amount.toFixed(2) : '';
                            const debit = transaction.type === 'debit' ? (-transaction.amount).toFixed(2) : '';
                            const runningBalance = data.transactions
                                .slice(0, index + 1)
                                .reduce((acc, curr) => acc + curr.amount, 0);
                            return [
                                transaction.date,
                                transaction.description,
                                { text: credit, color: 'green' },
                                { text: debit, color: 'red' },
                                { text: runningBalance.toFixed(2), color: runningBalance >= 0 ? 'green' : 'red' }
                            ];
                        })
                    ]
                },
                margin: [0, 0, 0, 20]
            },
            {
                text: `Total Balance: ${data.balance.current_balance.toFixed(2)} ${data.balance.currency}`,
                style: 'total',
                color: data.balance.current_balance >= 0 ? 'green' : 'red'
            },
            { image: '../assets/logo.jpg', alignment: 'right', width: 50, margin: [0, 50, 0, 0] },
            {
                text: 'Signature',
                style: 'signature',
            }
        ],
        styles: {
            orgName: {
                fontSize: 16,
                bold: true,
                margin: [0, 10, 0, 0]
            },
            header: {
                fontSize: 18,
                bold: true,
                alignment: 'center',
                margin: [0, 0, 0, 20]
            },
            total: {
                fontSize: 14,
                bold: true,
                alignment: 'right',
                margin: [0, 20, 0, 0]
            },
            signature: {
                alignment: 'right',
                italics: true,
                fontSize: 12
            }
        },
        defaultStyle: {
            font: 'Roboto'
        }
    };

    const pdfDoc = printer.createPdfKitDocument(documentDefinition);

    // Capture the PDF as a buffer and send it as a response
    const chunks = [];
    pdfDoc.on('data', chunk => chunks.push(chunk));
    pdfDoc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        
        // Set the headers for downloading the PDF file
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.pdf"');
        res.send(pdfBuffer); // Send the PDF buffer as the response
    });
    
    pdfDoc.end();
});

module.exports = app; // For deployment on Vercel


// const express = require('express');
// const Stripe = require('stripe')('sk_test_51Q6Fux1AQOYBeTYYhBdv6KgSrRWDmgTylAVet75TXllC30S8YgOY7EqoIrvPQwIfHV6T2lfknHD1RZTyGimhdLHF00Yw4DeBUG');
// const bodyParser = require('body-parser');

// const app = express();
// app.use(bodyParser.json());

// app.post('/create-payment-intent', async (req, res) => {
//     const { amount } = req.body;

//     try {
//         const paymentIntent = await Stripe.paymentIntents.create({
//             amount: amount, // Convert to smallest currency unit
//             currency: 'usd',
//         });

//         res.send({ clientSecret: paymentIntent.client_secret });
//     } catch (error) {
//         console.error('Error creating payment intent:', error);
//         res.status(500).send({ error: error.message });
//     }
// });

// // const PORT = process.env.PORT || 500;
// app.listen(500, () => {
//     // console.log(`Server is running on port ${PORT}`);
// });
// module.exports = app;
