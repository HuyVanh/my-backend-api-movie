const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

const {
  getTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  getMyTickets,
  getTicketByOrderId,
  getTicketsByEmail,
  getTicketsByUser,
  updatePaymentStatus,
  cancelTicket,      // ✅ THÊM
  validateTicket     // ✅ THÊM
} = require('../controllers/ticketController');

// ✅ Public routes
router.route('/order/:orderId').get(getTicketByOrderId);
router.route('/email/:email').get(getTicketsByEmail);

// ✅ Protected routes
router.use(protect);

router.route('/mytickets').get(getMyTickets);
router.route('/').post(createTicket);
router.route('/:id')
  .get(getTicket)
  .put(updateTicket)
  .delete(deleteTicket);

// ✅ THÊM: Payment và Cancel routes
router.route('/:id/payment').put(updatePaymentStatus);
router.route('/:id/cancel').put(cancelTicket);
router.route('/:id/validate').get(validateTicket);

// ✅ Admin routes
router.use(authorize('admin'));
router.route('/').get(getTickets);
router.route('/user/:userId').get(getTicketsByUser);

module.exports = router;