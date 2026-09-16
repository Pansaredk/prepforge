const mongoose = require('mongoose');

const interviewKitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Kit title is required'],
      trim: true
    },
    jobDescription: {
      type: String,
      required: [true, 'Job description is required']
    },
    companyUrl: {
      type: String,
      required: [true, 'Company URL is required'],
      trim: true
    },
    days: {
      type: Number,
      required: [true, 'Preparation days count is required'],
      min: [1, 'Days must be at least 1'],
      max: [60, 'Days cannot exceed 60'],
      validate: {
        validator: Number.isInteger,
        message: 'Days must be an integer'
      }
    },
    status: {
      type: String,
      enum: ['draft', 'generating', 'completed', 'failed'],
      default: 'draft',
      index: true
    },
    error: {
      type: String,
      default: null
    },
    companyBrief: {
      overview: { type: String, default: '' },
      products: [{ type: String }],
      industry: { type: String, default: '' },
      culture: [{ type: String }],
      interviewContext: { type: String, default: '' }
    },
    roleBreakdown: {
      summary: { type: String, default: '' },
      responsibilities: [{ type: String }],
      requiredSkills: [{ type: String }],
      niceToHaveSkills: [{ type: String }],
      interviewFocusAreas: [{ type: String }]
    },
    requirements: [
      {
        id: { type: String, required: true },
        text: { type: String, required: true },
        must: { type: Boolean, default: false },
        nice: { type: Boolean, default: false }
      }
    ],
    questionBank: [
      {
        id: { type: String, required: true },
        category: { type: String, required: true },
        question: { type: String, required: true },
        answerOutline: [{ type: String }],
        requirementIds: [{ type: String }],
        durationMinutes: { type: Number, required: true },
        source: { type: String, default: 'generated' },
        edited: { type: Boolean, default: false },
        pinned: { type: Boolean, default: false }
      }
    ],
    flashcards: [
      {
        id: { type: String, required: true },
        questionId: { type: String, required: true },
        front: { type: String, required: true },
        back: { type: String, required: true },
        confidence: { type: mongoose.Schema.Types.Mixed, default: null },
        covered: { type: Boolean, default: false }
      }
    ],
    schedule: {
      days: [
        {
          day: { type: Number, required: true },
          focus: { type: String, default: '' },
          questionIds: [{ type: String }],
          minutes: { type: Number, default: 0 }
        }
      ]
    },
    research: {
      company: {
        url: { type: String, default: '' },
        title: { type: String, default: '' },
        summary: { type: String, default: '' },
        sources: [{ type: String }]
      },
      hiring: {
        found: { type: Boolean, default: false },
        url: { type: String, default: '' },
        title: { type: String, default: '' },
        summary: { type: String, default: '' },
        sources: [{ type: String }]
      },
      sources: [
        {
          url: { type: String },
          title: { type: String },
          status: { type: String }
        }
      ],
      errors: [{ type: String }],
      publicDiscussion: {
        available: { type: Boolean, default: false },
        sources: [{ type: String }]
      }
    },
    coverage: {
      passes: { type: Number, default: 1 },
      mustCovered: [{ type: String }],
      mustUncovered: [{ type: String }],
      niceCovered: [{ type: String }],
      niceUncovered: [{ type: String }],
      isComplete: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true
  }
);

interviewKitSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const InterviewKit = mongoose.model('InterviewKit', interviewKitSchema);

module.exports = InterviewKit;
