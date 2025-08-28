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
  getTicketsByShowtime,        
  getSeatBookingStatus,
  scanTicket,
  getScanHistory,
  getEmployeeScanHistory
} = require('../controllers/ticketController');

router.route('/debug').get(debugTickets);

// ✅ Public search routes
router.route('/order/:orderId').get(getTicketByOrderId);
router.route('/email/:email').get(getTicketsByEmail);

// ✅ Protected routes (require authentication)
router.use(protect);

// ✅ User's own tickets
router.route('/mytickets').get(getMyTickets);
router.route('/scan').post(scanTicket);
router.route('/scan-history').get(getScanHistory);

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

// ✅ FIXED: Employee scan history route - sử dụng đúng middleware names
router.route('/employee-scan-history/:employeeId').get(getEmployeeScanHistory);

module.exports = router;