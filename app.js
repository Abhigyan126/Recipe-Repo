const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.static('public'));
app.use(express.json());

try {
    const mongoAtlasUri = "your mongodb url here";
    mongoose.connect(mongoAtlasUri);
    mongoose.connection.on('connected', () => {
        console.log('Mongoose connected to MongoDB');
    });
    mongoose.connection.on('error', (err) => {
        console.error('Mongoose connection error:', err);
    });
    mongoose.connection.on('disconnected', () => {
        console.log('Mongoose disconnected');
    });
} catch (e) {
    console.error('Could not connect to MongoDB:', e.message);
}

const recipeSchema = new mongoose.Schema({
    title: { type: String, unique: true, required: true },
    alias: { type: String, required: true },
    ingredients: [String],
    instructions: String,
    ratings: { type: Number, default: 0 }, // Change to single number
    ratingCount: { type: Number, default: 0 }, // Track number of ratings
    createdAt: { type: Date, default: Date.now }
});

const Recipe = mongoose.model('Recipe', recipeSchema);

app.post('/recipes', async (req, res) => {
    try {
        const existingRecipe = await Recipe.findOne({ title: req.body.title });
        if (existingRecipe) {
            return res.status(400).json({ message: 'Recipe with the same title already exists' });
        }
        const newRecipe = new Recipe({
            title: req.body.title,
            alias: req.body.alias,
            ingredients: req.body.ingredients,
            instructions: req.body.instructions
        });
        await newRecipe.save();
        res.status(201).json(newRecipe);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.get('/recipes', async (req, res) => {
    try {
        const searchQuery = req.query.search;
        let recipes;
        if (searchQuery) {
            recipes = await Recipe.find({
                $or: [
                    { title: { $regex: searchQuery, $options: 'i' } },
                    { ingredients: { $regex: searchQuery, $options: 'i' } }
                ]
            }).sort({ createdAt: 'desc' });
        } else {
            recipes = await Recipe.find().sort({ createdAt: 'desc' });
        }
        res.json(recipes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/recipes/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }
        recipe.title = req.body.title;
        recipe.alias = req.body.alias;
        recipe.ingredients = req.body.ingredients;
        recipe.instructions = req.body.instructions;
        await recipe.save();
        res.json(recipe);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.patch('/recipes/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }
        if (req.body.rating && typeof req.body.rating === 'number' && req.body.rating >= 1 && req.body.rating <= 5) {
            recipe.ratings = (recipe.ratings * recipe.ratingCount + req.body.rating) / (recipe.ratingCount + 1); // Calculate new average
            recipe.ratingCount++; 
        }
        await recipe.save();
        res.json({ recipe, averageRating: recipe.ratings }); // Send back the updated averageRating
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/recipes/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findByIdAndDelete(req.params.id);
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }
        res.json({ message: 'Recipe deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/recipes/share/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }
        const recipeLink = `https://yourdomain.com/recipes/${recipe._id}`; // Construct the recipe link
        res.status(200).json({ message: 'Recipe shared successfully', recipeLink });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/recipes', async (req, res) => {
    try {
        const searchQuery = req.query.search;
        let recipes;
        if (searchQuery) {
            recipes = await Recipe.find({
                $or: [
                    { title: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive search by title
                    { ingredients: { $regex: searchQuery, $options: 'i' } } // Case-insensitive search by ingredients
                ]
            }).sort({ createdAt: 'desc' });
        } else {
            recipes = await Recipe.find().sort({ createdAt: 'desc' });
        }
        res.json(recipes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
