const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



app.get('/', (req, res) => {
	res.send('Global Language is ongoing');
})

app.listen(port, () => {
	console.log(`Global Language is ongoing on port:${port}`);
})