import mongoose from 'mongoose';
import { buildGameSearchString } from '../utils/gameVector.js';
import { generateEmbedding } from '../services/embeddingService.js';

const gameSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        genre: {
            type: String,
            required: true,
        },
        studio: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        featured: {
            type: Boolean,
            default: false,
        },
        featureExpiresAt: {
            type: Date,
            default: null,
        },
        lastFeaturedAt: {
            type: Date,
            default: null,
        },
        systemFeatured: {
            type: Boolean,
            default: false,
        },
        systemFeaturedUntil: {
            type: Date,
            default: null,
        },
        published: {
            type: Boolean,
            default: true,
        },
        discountPercent: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        tags: {
            type: [String],
            default: [],
        },
        game_vector: {
            type: [Number],
            default: [],
        },
        rating: {
            type: Number,
            default: 4.5,
            min: 0,
            max: 5,
        },
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        media: {
            cover: String,
            gallery: [String],
        },
        downloads: {
            type: Number,
            default: 0,
        },
        revenue: {
            type: Number,
            default: 0,
        },


        reviews: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                username: {
                    type: String,
                    required: true,
                },
                rating: {
                    type: Number,
                    required: true,
                    min: 1,
                    max: 5,
                },
                comment: {
                    type: String,
                    required: true,
                },
                likes: [
                    {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                    },
                ],
                dislikes: [
                    {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                    },
                ],
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

gameSchema.pre('save', async function (next) {
    if (!this.isNew && !this.isModified('title') && !this.isModified('genre') && !this.isModified('tags') && !this.isModified('description')) {
        return next();
    }

    try {
        const searchString = buildGameSearchString({
            title: this.title,
            genre: this.genre,
            tags: this.tags,
            description: this.description,
        });
        this.game_vector = await generateEmbedding(searchString);
        next();
    } catch (error) {
        next(error as Error);
    }
});

export const Game = mongoose.model('Game', gameSchema);
