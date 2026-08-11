import mongoose from 'mongoose';
const { Schema } = mongoose;

const orderSchema = new mongoose.Schema(
  {
    // Order Information
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded',
      ],
      default: 'pending',
    },
    isTestOrder: {
      type: Boolean,
      default: false,
    },

    // Order Items
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        // Denormalised from the product at order time so vendor order queries
        // (`{'items.vendor': id}`) can filter in the database. Without this
        // path on the schema, Mongoose's strict query silently DROPS that
        // condition and returns every order on the platform.
        vendor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          index: true,
        },
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          amount: {
            type: Number,
            required: true,
            min: 0,
          },
          currency: {
            type: String,
            enum: ['KES', 'USD', 'TZS', 'UGX'],
            default: 'KES',
          },
        },
        thumbnail: String,
        sku: String,
        variant: String,
      },
    ],

    // Pricing
    subtotal: {
      amount: Number,
      currency: String,
    },
    shipping: {
      amount: Number,
      currency: String,
      method: String,
      trackingNumber: String,
      carrier: String,
    },
    tax: {
      amount: Number,
      currency: String,
      rate: Number,
    },
    discount: {
      amount: Number,
      currency: String,
      code: String,
    },
    total: {
      amount: Number,
      currency: String,
    },

    // Customer Information
    customer: {
      name: String,
      email: String,
      phone: String,
    },

    // Shipping Information
    shippingAddress: {
      firstName: String,
      lastName: String,
      company: String,
      address1: String,
      address2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      phone: String,
    },

    // Billing Information
    billingAddress: {
      sameAsShipping: {
        type: Boolean,
        default: true,
      },
      firstName: String,
      lastName: String,
      company: String,
      address1: String,
      address2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      phone: String,
    },

    // Payment Information
    payment: {
      method: {
        type: String,
        enum: ['card', 'paypal', 'mpesa', 'cash_on_delivery', 'bank_transfer'],
        required: true,
      },
      status: {
        type: String,
        enum: [
          'pending',
          'processing',
          'authorized',
          'paid',
          'failed',
          'refunded',
          'partially_refunded',
          'cancelled',
        ],
        default: 'pending',
      },
      provider: {
        type: String,
        enum: ['stripe', 'paypal', 'mpesa', 'manual'],
      },
      // Enhanced payment tracking
      transactionId: String,
      paymentIntentId: String,
      paymentMethodId: String,

      // Stripe specific
      stripe: {
        customerId: String,
        paymentMethod: String, // Store only the payment method ID as a string
        paymentMethodDetails: {
          type: Map, // Use Map type to store flexible payment method details
          of: Schema.Types.Mixed, // Allow any type of value
          default: {},
        },
        refunds: [
          {
            id: String,
            amount: Number,
            currency: String,
            reason: String,
            status: String,
            created: Date,
            receiptNumber: String,
          },
        ],
      },

      // M-Pesa specific
      mpesa: {
        receiptNumber: String,
        phoneNumber: String,
        transactionDate: Date,
        merchantRequestId: String,
        checkoutRequestId: String,
        resultCode: String,
        resultDesc: String,
      },

      // PayPal specific
      paypal: {
        orderId: String,
        payerId: String,
        paymentId: String,
        captureId: String,
        status: String,
      },

      // Error handling
      error: {
        code: String,
        message: String,
        declineCode: String,
        details: mongoose.Schema.Types.Mixed,
      },

      /**
       * Human verification of a real transaction.
       *
       * Every automated path above can be wrong in a way the gateway itself
       * won't tell you: the M-Pesa sandbox is configured to simulate its own
       * callback (`MPESA_SIMULATE_CALLBACK`), so a "paid" order here may have
       * moved no money at all; cash on delivery is money that changes hands
       * with nothing watching; and a bank transfer is only ever confirmed by
       * a person looking at a statement. This subdocument is where that look
       * gets recorded, so `payment.status: 'paid'` always has a reason behind
       * it that someone can point at.
       *
       * `state` is deliberately separate from `payment.status`: a customer
       * submitting a reference is a claim, not a payment, and the two must
       * not be the same field or the claim would mark the order paid.
       */
      verification: {
        state: {
          type: String,
          enum: ['none', 'submitted', 'confirmed', 'rejected'],
          default: 'none',
          index: true,
        },
        // What the payer says identifies the transaction — an M-Pesa
        // confirmation code, a bank reference, a receipt number.
        reference: {
          type: String,
          trim: true,
          maxlength: [64, 'Reference cannot exceed 64 characters'],
        },
        // How it was actually paid, which is not always `payment.method`:
        // a card order that failed and was settled in cash is both.
        channel: {
          type: String,
          enum: ['mpesa', 'bank_transfer', 'cash', 'card', 'paypal', 'other'],
        },
        // Amount the reviewer confirms was received. Stored rather than
        // assumed equal to the order total, because a short payment is a real
        // thing that happens and the gap is what the admin needs to see.
        amountReceived: Number,
        submittedAt: Date,
        submittedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        // Free text from whoever paid ("sent from a different number").
        payerNote: {
          type: String,
          trim: true,
          maxlength: [500, 'Note cannot exceed 500 characters'],
        },
        reviewedAt: Date,
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        // Why it was confirmed or rejected. Required on a rejection by the
        // controller — "rejected" with no reason is unactionable for the
        // customer who then has to ask.
        reviewNote: {
          type: String,
          trim: true,
          maxlength: [500, 'Note cannot exceed 500 characters'],
        },
      },

      // Timestamps
      timestamps: {
        initiatedAt: { type: Date, default: Date.now },
        processedAt: Date,
        completedAt: Date,
        failedAt: Date,
        refundedAt: Date,
      },
    },

    // Order Metadata
    notes: [
      {
        content: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        isSystem: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Audit Fields
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'admin'],
      default: 'web',
    },

    // Status History
    statusHistory: [
      {
        status: String,
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        comment: String,
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],

    /**
     * Cancellation.
     *
     * These three were written by `cancelOrder` and never declared here, so
     * Mongoose's strict mode dropped every one of them on save. The customer's
     * reason went in and vanished, and the "why this was cancelled" block on
     * `/account/orders` could never render — it was reading a field the
     * database had never been told to keep.
     */
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook to generate order number
orderSchema.pre('save', async function (next) {
  // Only generate order number for new documents
  if (this.isNew) {
    try {
      // Generate a random 8-character alphanumeric string
      const randomString = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();
      // Add a timestamp to ensure uniqueness
      const timestamp = Date.now().toString().slice(-4);
      this.orderNumber = `ORD-${timestamp}-${randomString}`;

      // Double check if this order number already exists (very unlikely but possible)
      const existingOrder = await this.constructor.findOne({
        orderNumber: this.orderNumber,
      });
      if (existingOrder) {
        // If by some chance it exists, try again with a different random string
        this.orderNumber = `ORD-${timestamp}-${Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase()}`;
      }
    } catch (error) {
      // Fallback to a simple timestamp-based order number if there's an error
      this.orderNumber = `ORD-${Date.now()}`;
    }
  }
  next();
});

// Add indexes for better query performance
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ 'payment.method': 1 });
orderSchema.index({ 'payment.provider': 1 });
orderSchema.index({ 'payment.stripe.customerId': 1 });
orderSchema.index({ 'payment.stripe.paymentMethod.id': 1 });
orderSchema.index({ isTestOrder: 1 });
orderSchema.index({ createdAt: -1 });

// Pre-save hook to update status history
orderSchema.pre('save', function (next) {
  if (this.isModified('status') || this.isModified('payment.status')) {
    this.statusHistory = this.statusHistory || [];
    const statusToLog = this.isModified('status')
      ? this.status
      : `payment_${this.payment.status}`;

    // Get the previous values using getChanges()
    const changes = this.getChanges();
    const prevStatus = changes.$set?.status;
    const prevPaymentStatus = changes.$set?.['payment.status'];

    this.statusHistory.push({
      status: statusToLog,
      changedBy: this.user,
      comment: `Status changed to ${statusToLog}`,
      metadata: {
        previousStatus: this.isModified('status') ? prevStatus : undefined,
        previousPaymentStatus: this.isModified('payment.status')
          ? prevPaymentStatus
          : undefined,
      },
    });
  }
  next();
});

// Generate order number
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${(count + 1)
      .toString()
      .padStart(5, '0')}`;

    // Set default payment status based on method
    if (this.payment) {
      if (!this.payment.status) {
        this.payment.status = 'pending';
      }
      if (this.payment.method === 'cash_on_delivery') {
        this.payment.status = 'pending';
      }

      // Initialize timestamps
      if (!this.payment.timestamps) {
        this.payment.timestamps = {
          initiatedAt: new Date(),
        };
      }
    }

    // Mark as test order in non-production environments
    if (process.env.NODE_ENV !== 'production' && !this.isTestOrder) {
      this.isTestOrder = true;
      // Don't save here to prevent parallel saves, it will be saved with the main document
      this.addSystemNote('Test order created', { save: false });
    }
  }
  next();
});

// Instance method to add system notes
orderSchema.methods.addSystemNote = function (content, options = {}) {
  this.notes = this.notes || [];
  this.notes.push({
    content,
    isSystem: true,
    createdAt: new Date(),
  });

  // Only save if not in the middle of a save operation
  if (options.save !== false) {
    return this.save();
  }
  return this;
};

// Instance method to update payment status
orderSchema.methods.updatePaymentStatus = async function (
  status,
  details = {},
  options = {}
) {
  const previousStatus = this.payment.status;
  this.payment.status = status;

  const now = new Date();
  this.payment.timestamps = this.payment.timestamps || {};

  // Update timestamps based on status
  if (['processing', 'authorized'].includes(status)) {
    this.payment.timestamps.processedAt =
      this.payment.timestamps.processedAt || now;
  } else if (status === 'paid') {
    this.payment.timestamps.completedAt = now;
    if (previousStatus !== 'paid') {
      this.status = 'processing';
    }
  } else if (status === 'failed') {
    this.payment.timestamps.failedAt = now;
    if (options.cancelOrderOnFailure !== false) {
      this.status = 'cancelled';
    }
  } else if (status === 'refunded' || status === 'partially_refunded') {
    this.payment.timestamps.refundedAt = now;
  }

  // Update payment details
  if (details) {
    // Update provider if provided and valid
    if (details.provider) {
      this.payment.provider = ['stripe', 'paypal', 'mpesa', 'manual'].includes(
        details.provider
      )
        ? details.provider
        : 'manual';
    }

    // Update transaction IDs
    if (details.transactionId) {
      this.payment.transactionId = details.transactionId;
    }
    if (details.paymentIntentId) {
      this.payment.paymentIntentId = details.paymentIntentId;
    }
    if (details.paymentMethodId) {
      this.payment.paymentMethodId = details.paymentMethodId;
    }

    // Update provider-specific details
    if (details.stripe) {
      this.payment.stripe = {
        ...(this.payment.stripe || {}),
        ...details.stripe,
      };
    }
    if (details.mpesa) {
      this.payment.mpesa = {
        ...(this.payment.mpesa || {}),
        ...details.mpesa,
      };
    }
    if (details.paypal) {
      this.payment.paypal = {
        ...(this.payment.paypal || {}),
        ...details.paypal,
      };
    }

    // Update error details if any
    if (details.error) {
      this.payment.error = {
        ...(this.payment.error || {}),
        ...details.error,
        timestamp: now,
      };
    }
  }

  // Add system note for status change — don't save here, it goes out with
  // the this.save() below (see the identical note on addSystemNote's own
  // pre-save-hook usage above: parallel save() calls on the same doc throw).
  if (previousStatus !== status) {
    const note = `Payment status changed from ${previousStatus} to ${status}`;
    this.addSystemNote(note, { save: false });
  }

  return this.save();
};

// Static method to find by transaction ID
orderSchema.statics.findByTransactionId = function (transactionId) {
  if (!transactionId) return Promise.resolve(null);

  return this.findOne({
    $or: [
      { 'payment.transactionId': transactionId },
      { 'payment.mpesa.checkoutRequestId': transactionId },
      { 'payment.mpesa.merchantRequestId': transactionId },
      { 'payment.paypal.orderId': transactionId },
      { 'payment.paypal.paymentId': transactionId },
      { 'payment.stripe.paymentIntentId': transactionId },
    ],
  });
};

// Static method to create a test order
orderSchema.statics.createTestOrder = async function (orderData) {
  const testOrder = new this({
    ...orderData,
    isTestOrder: true,
    status: 'pending',
    payment: {
      ...orderData.payment,
      status: 'pending',
      timestamps: {
        initiatedAt: new Date(),
      },
    },
  });

  // Add test card details if it's a card payment
  if (orderData.payment?.method === 'card') {
    testOrder.payment.stripe = testOrder.payment.stripe || {};
    testOrder.payment.stripe.paymentMethod = {
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2034,
        country: 'US',
      },
    };
  }

  await testOrder.save();
  testOrder.addSystemNote('Test order created with mock payment data');
  return testOrder;
};

// Virtual for formatted order total
orderSchema.virtual('formattedTotal').get(function () {
  return `${this.total.currency} ${(this.total.amount / 100).toFixed(2)}`;
});

// Virtual for isPaid
orderSchema.virtual('isPaid').get(function () {
  return ['paid', 'refunded', 'partially_refunded'].includes(
    this.payment?.status
  );
});

export default mongoose.model('Order', orderSchema);
