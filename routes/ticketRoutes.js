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
  cancelTicket,
  validateTicket,
  debugTickets,
  getTicketStats,
  getTicketsByShowtime,        // ✅ THÊM DÒNG NÀY
  getSeatBookingStatus         // ✅ THÊM DÒNG NÀY
} = require('../controllers/ticketController');

// ============ PUBLIC ROUTES (No Authentication Required) ============

// ✅ Debug endpoint - Should be FIRST for easy access
router.route('/debug').get(debugTickets);

// ✅ Public search routes
router.route('/order/:orderId').get(getTicketByOrderId);
router.route('/email/:email').get(getTicketsByEmail);

// ============ PROTECTED ROUTES (Authentication Required) ============
router.use(protect);

// ✅ User's own tickets
router.route('/mytickets').get(getMyTickets);

// ✅ Ticket creation
router.route('/').post(createTicket);

// ✅ Individual ticket operations
router.route('/:id')
  .get(getTicket)        // Get ticket detail
  .put(updateTicket)     // Update ticket (will be restricted to admin later)
  .delete(deleteTicket); // Delete ticket (will be restricted to admin later)

// ✅ Ticket actions
router.route('/:id/payment').put(updatePaymentStatus);
router.route('/:id/cancel').put(cancelTicket);
router.route('/:id/validate').get(validateTicket);

// ============ ADMIN ROUTES (Admin Authorization Required) ============
router.use(authorize('admin'));

// ✅ NEW: Booking status routes
router.route('/showtime/:showtimeId').get(getTicketsByShowtime);
router.route('/seat-status/:showtimeId').get(getSeatBookingStatus);

// ✅ Admin-only endpoints  
router.route('/').get(getTickets);                    // Get all tickets with pagination
router.route('/stats').get(getTicketStats);          // Get ticket statistics
router.route('/user/:userId').get(getTicketsByUser); // Get tickets by specific user

module.exports = router;