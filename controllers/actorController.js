const Actor = require('../models/actorModel');

// @desc    Lấy tất cả diễn viên
// @route   GET /api/actors
// @access  Public
exports.getActors = async (req, res) => {
  try {
    const actors = await Actor.find();

    res.status(200).json({
      success: true,
      count: actors.length,
      data: actors
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy chi tiết diễn viên
// @route   GET /api/actors/:id
// @access  Public
exports.getActor = async (req, res) => {
  try {
    const actor = await Actor.findById(req.params.id);

    if (!actor) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy diễn viên'
      });
    }

    res.status(200).json({
      success: true,
      data: actor
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Tạo diễn viên mới
// @route   POST /api/actors
// @access  Private (Admin)
exports.createActor = async (req, res) => {
  try {
    const actor = await Actor.create(req.body);

    res.status(201).json({
      success: true,
      data: actor
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Cập nhật diễn viên
// @route   PUT /api/actors/:id
// @access  Private (Admin)
exports.updateActor = async (req, res) => {
  try {
    let actor = await Actor.findById(req.params.id);

    if (!actor) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy diễn viên'
      });
    }

    actor = await Actor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: actor
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Xóa diễn viên
// @route   DELETE /api/actors/:id
// @access  Private (Admin)
exports.deleteActor = async (req, res) => {
  try {
    const actor = await Actor.findById(req.params.id);

    if (!actor) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy diễn viên'
      });
    }

    await Actor.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Upload ảnh cho diễn viên
// @route   PUT /api/actors/:id/image
// @access  Private (Admin)
exports.uploadActorImage = async (req, res) => {
  try {
    const actor = await Actor.findById(req.params.id);

    if (!actor) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy diễn viên'
      });
    }

    // Logic upload file tại đây
    res.status(200).json({
      success: true,
      data: 'Ảnh đã được upload thành công'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};