const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import controllers (chúng ta sẽ tạo sau)
const {
  getActors,
  getActor,
  createActor,
  updateActor,
  deleteActor,
  uploadActorImage
} = require('../controllers/actorController');

// Routes công khai
router.route('/').get(getActors);
router.route('/:id').get(getActor);

// Routes cho admin
router.use(protect);
router.use(authorize('admin'));

router.route('/').post(createActor);
router.route('/:id')
  .put(updateActor)
  .delete(deleteActor);

router.route('/:id/image').put(uploadActorImage);

module.exports = router;