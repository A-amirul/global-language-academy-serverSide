const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iutwb2x.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	}
});

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		await client.connect();

		const instructorCollection = client.db("languageDb").collection("instructors");
		const classesCollection = client.db("languageDb").collection("classes");
		const myClassCollection = client.db("languageDb").collection("myClass");

		// instructor API
		app.get('/instructors', async (req, res) => {
			const result = await instructorCollection.find().toArray();
			res.send(result);
		})


		// classes API
		app.get('/classes', async (req, res) => {
			const result = await classesCollection.find().toArray();
			res.send(result);
		})

		// my Class collection 
		app.get('/myClass', async(req,res) => {
			const email = req.query.email;
			if (!email) {
				res.send([]);
			}
			const query = { email: email };
			const result = await myClassCollection.find().toArray();
			res.send(result);
		})


		app.post('/myClass', async (req, res) => {
			const item = req.body;
			console.log(item);
			const result = await myClassCollection.insertOne(item);
			res.send(result);
		})





		// Send a ping to confirm a successful connection
		await client.db("admin").command({ ping: 1 });
		console.log("Pinged your deployment. You successfully connected to MongoDB!");
	} finally {
		// Ensures that the client will close when you finish/error
		// await client.close();
	}
}
run().catch(console.dir);



app.get('/', (req, res) => {
	res.send('Global Language is ongoing');
})

app.listen(port, () => {
	console.log(`Global Language is ongoing on port:${port}`);
})