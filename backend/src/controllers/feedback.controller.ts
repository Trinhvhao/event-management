import { Request, Response, NextFunction } from 'express';
import * as feedbackService from '../services/feedback.service';
import { successResponse } from '../utils/response.util';
import {
  getAuthenticatedUser,
  parsePositiveInt,
  parseQueryInt,
} from '../utils/request.util';

export const submitFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = getAuthenticatedUser(req).id;
    const feedbackData = req.body;

    const feedback = await feedbackService.submitFeedback(userId, feedbackData);

    res.status(201).json(successResponse(feedback, 'Gửi đánh giá thành công'));
  } catch (error) {
    next(error);
  }
};

export const getEventFeedbacks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const eventId = parsePositiveInt(req.params.eventId, 'eventId');
    const { limit, offset } = req.query;

    const result = await feedbackService.getEventFeedbacks(
      eventId,
      parseQueryInt(limit, 20, 'limit', { min: 1 }),
      parseQueryInt(offset, 0, 'offset', { min: 0 })
    );

    res.json(successResponse(result, 'Lấy danh sách đánh giá thành công'));
  } catch (error) {
    next(error);
  }
};

export const getMyFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = getAuthenticatedUser(req).id;
    const eventId = parsePositiveInt(req.params.eventId, 'eventId');

    const feedback = await feedbackService.getMyFeedback(userId, eventId);

    if (!feedback) {
      res.status(404).json({
        success: false,
        message: 'Bạn chưa đánh giá sự kiện này',
      });
      return;
    }

    res.json(successResponse(feedback, 'Lấy đánh giá thành công'));
  } catch (error) {
    next(error);
  }
};

export const getFeedbackSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const eventId = parsePositiveInt(req.params.eventId, 'eventId');

    const summary = await feedbackService.getFeedbackSummary(eventId);

    res.json(successResponse(summary, 'Lấy tóm tắt đánh giá thành công'));
  } catch (error) {
    next(error);
  }
};

export const getTopRatedEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit } = req.query;

    const events = await feedbackService.getTopRatedEvents(
      parseQueryInt(limit, 10, 'limit', { min: 1 })
    );

    res.json(successResponse(events, 'Lấy sự kiện được đánh giá cao thành công'));
  } catch (error) {
    next(error);
  }
};


