const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const { Client, Databases, Account, Query } = require("appwrite");

const app = express();
const PORT = 50;

// Appwrite configuration
const client = new Client();
client
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('66f8407c00256a34e05f');

const databases = new Databases(client);
const account = new Account(client);
const DATABASE_ID = '66f842800003a726a5dd'; // Your database ID
const COLLECTION_ID = '67013ff00022975587a9'; // Your orders collection ID

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Session management
app.use(session({
    secret: 'your_secret_key', // Change this to a strong secret
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 180 * 60 * 1000 } // 3 hours
}));

// Middleware to check authentication and redirect if not authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect("/login"); // Redirect to login page
};

// User login route
// Define a list of authorized emails
const authorizedEmails = ['admin@admin.com', 'delivery@admin.com']; // Add your authorized emails here

// User login route
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    // Check if the email is authorized
    if (!authorizedEmails.includes(email)) {
        return res.status(401).send("Unauthorized access: Invalid email or password");
    }

    try {
        const session = await account.createEmailPasswordSession(email, password);
        req.session.userId = session.$id; // Store session ID in session
        res.status(200).send("Login successful");
        console.log(session);
    } catch (error) {
        console.error(error);
        res.status(401).send("Unauthorized access: Invalid email or password");
    }
});


// Serve the login page
app.get("/login", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
</head>
<body class="flex items-center justify-center min-h-screen bg-gray-100">
    <div class="bg-white p-8 rounded-lg shadow-lg w-96">
        <h1 class="text-2xl font-bold mb-6 text-center">Login</h1>
        <form id="login-form">
            <div class="mb-4">
                <label for="email" class="block text-gray-700">Email:</label>
                <input type="email" id="email" name="email" required class="border border-gray-300 rounded-lg p-2 w-full" />
            </div>
            <div class="mb-4">
                <label for="password" class="block text-gray-700">Password:</label>
                <input type="password" id="password" name="password" required class="border border-gray-300 rounded-lg p-2 w-full" />
            </div>
            <button type="submit" class="bg-blue-500 text-white font-bold py-2 rounded-lg w-full hover:bg-blue-600 transition duration-200">Login</button>
        </form>
        <div id="message" class="mt-4 text-red-500 text-center"></div>
    </div>
    <script>
        document.getElementById('login-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                await axios.post('/api/login', { email, password });
                window.location.href = '/'; // Redirect to dashboard on success
            } catch (error) {
                document.getElementById('message').innerText = 'Unauthorized access: Invalid email or password';
            }
        });
    </script>
</body>
</html>
    `);
});

// Fetch all orders - protected route with pagination
app.get("/api/orders", isAuthenticated, async (req, res) => {
    const limit = parseInt(req.query.limit) || 25; // Default limit
    const offset = parseInt(req.query.offset) || 0; // Default offset

    try {
        const orders = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
            Query.orderDesc('$createdAt'), // Sort by creation date in descending order
            Query.limit(limit),
            Query.offset(offset)
        ]);

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // Calculate one hour ago
        const recentOrdersCount = orders.documents.filter(order => new Date(order.$createdAt) >= oneHourAgo).length;

        res.json({
            orders: orders.documents,
            total: orders.total, // Total number of orders
            recentOrdersCount, // Orders in the last hour
            totalPages: Math.ceil(orders.total / limit) // Calculate total pages
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching orders");
    }
});




// Update order status - protected route
app.put("/api/orders/:id", isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID, id, { status });
        res.status(200).send("Order status updated");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating order status");
    }
});

// Logout route
app.post("/api/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send("Error logging out");
        }
        res.status(200).send("Logout successful");
    });
});

// React-like rendering for the dashboard
// React-like rendering for the dashboard
// React-like rendering for the dashboard
const renderDashboard = () => {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Admin Dashboard</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
        </head>
        <body class="bg-gray-100">
            <div class="container mx-auto p-4">
                <h1 class="text-3xl font-bold mb-4">Admin Dashboard</h1>
                <button id="logout-button" class="bg-red-500 text-white px-4 py-2 rounded mb-4">Logout</button>
                <p id="orders-count" class="mb-2 text-gray-700"></p> <!-- Total orders count -->
                <p id="recent-orders-count" class="mb-2 text-gray-700"></p> <!-- Orders in the last hour -->
                <p id="pagination-info" class="mb-4 text-gray-700"></p> <!-- Pagination info -->
                <div class="flex justify-between mt-4">
                    <button id="prev-button" onclick="fetchOrders(currentPage - 1)" class="bg-blue-500 text-white px-4 py-2 rounded" disabled>Previous</button>
                    <button id="next-button" onclick="fetchOrders(currentPage + 1)" class="bg-blue-500 text-white px-4 py-2 rounded">Next</button>
                </div>
                <div class="overflow-x-auto bg-white shadow-md rounded-lg">
                    <table class="min-w-full">
                        <thead class="bg-gray-200">
                            <tr>
                                <th class="px-4 py-2 text-left">Order ID</th>
                                <th class="px-4 py-2 text-left">Buyer Name</th>
                                <th class="px-4 py-2 text-left">Name</th>
                                <th class="px-4 py-2 text-left">Quantity</th>
                                <th class="px-4 py-2 text-left">Payment Mode</th>
                                <th class="px-4 py-2 text-left">Amount</th>
                                <th class="px-4 py-2 text-left">Delivery Note</th>
                                <th class="px-4 py-2 text-left">Location</th>
                                <th class="px-4 py-2 text-left">Status</th>
                                <th class="px-4 py-2 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="orders-table-body" class="divide-y divide-gray-200">
                        </tbody>
                    </table>
                </div>
                
                
            </div>

            <script>
                let currentPage = 0; // Initialize current page
                const limit = 25; // Set the number of orders per page

                document.getElementById('logout-button').addEventListener('click', async () => {
                    try {
                        await axios.post('/api/logout');
                        window.location.href = '/login'; // Redirect to login page
                    } catch (error) {
                        console.error("Error logging out:", error);
                    }
                });

                async function fetchOrders(page = 0) {
                    try {
                        const offset = page * limit;
                        const response = await axios.get('/api/orders', {
                            params: { limit, offset }
                        });
                        const orders = response.data.orders;
                        const ordersTableBody = document.getElementById('orders-table-body');
                        ordersTableBody.innerHTML = '';

                        // Update counts
                        document.getElementById('orders-count').innerText = 'Total Orders: ' + response.data.total; // Display total orders
                        document.getElementById('recent-orders-count').innerText = 'Orders in the last hour: ' + response.data.recentOrdersCount;

                        // Update pagination info
                        document.getElementById('pagination-info').innerText = 'Page ' + (page + 1) + ' of ' + response.data.totalPages;

                        if (orders.length === 0) {
                            ordersTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4">No orders found</td></tr>';
                        } else {
                            orders.forEach(order => {
                                const row = document.createElement('tr');
                                row.innerHTML = \`
                                    <td class="px-4 py-2">\${order.\$id}</td>
                                    <td class="px-4 py-2">\${order.Username}</td>
                                    <td class="px-4 py-2">\${order.name}</td>
                                    <td class="px-4 py-2">\${order.quantity}</td>
                                    <td class="px-4 py-2">\${order.paymentMode}</td>
                                    <td class="px-4 py-2">$\${order.amt}</td>
                                    <td class="px-4 py-2">\${order.note}</td>
                                    <td class="px-4 py-2">\${order.location}</td>
                                    <td class="px-4 py-2">
                                        <select onchange="updateStatus('\${order.\$id}', this.value)" class="border border-gray-300 rounded">
                                            <option value="orderPending" \${order.status === 'orderPending' ? 'selected' : ''}>Pending</option>
                                            <option value="orderConfirmed" \${order.status === 'orderConfirmed' ? 'selected' : ''}>Confirmed</option>
                                            <option value="orderPreparing" \${order.status === 'orderPreparing' ? 'selected' : ''}>Preparing</option>
                                            <option value="orderDispatch" \${order.status === 'orderDispatch' ? 'selected' : ''}>Dispatch</option>
                                            <option value="orderDelivered" \${order.status === 'orderDelivered' ? 'selected' : ''}>Delivered</option>
                                        </select>
                                    </td>
                                    <td class="px-4 py-2">
                                        <button onclick="updateStatus('\${order.\$id}', document.querySelector('select').value)" class="bg-green-500 text-white px-2 py-1 rounded">Update Status</button>
                                    </td>
                                \`;
                                ordersTableBody.appendChild(row);
                            });
                        }

                        // Enable/disable pagination buttons based on current page
                        document.getElementById('prev-button').disabled = page === 0;
                        document.getElementById('next-button').disabled = orders.length < limit;
                        currentPage = page; // Update current page
                    } catch (error) {
                        console.error("Error fetching orders:", error);
                    }
                }

                async function updateStatus(orderId, status) {
                    try {
                        await axios.put('/api/orders/' + orderId, { status });
                        fetchOrders(currentPage); // Refresh orders after update
                    } catch (error) {
                        console.error("Error updating order status:", error);
                    }
                }

                // Fetch orders on page load
                fetchOrders();
            </script>
        </body>
        </html>
    `;
};




// Serve the dashboard
app.get("/", isAuthenticated, (req, res) => {
    res.send(renderDashboard());
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
