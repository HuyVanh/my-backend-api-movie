const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import controllers (chúng ta sẽ tạo sau)
const {
  getTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  getMyTickets
} = require('../controllers/ticketController');

// Routes cho user
router.use(protect);

router.route('/mytickets').get(getMyTickets);
router.route('/').post(createTicket);

// Routes cho admin
router.use(authorize('admin'));

router.route('/').get(getTickets);
router.route('/:id')
  .get(getTicket)
  .put(updateTicket)
  .delete(deleteTicket);

module.exports = router;