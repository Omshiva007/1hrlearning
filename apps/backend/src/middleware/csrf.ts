import { Request, Response, NextFunction } from 'express';

function csrfProtection(req: Request, res: Response, next: NextFunction) {
    const token = req.headers['csrf-token'];

    // Validate the CSRF token
    if (!token || token !== req.session.csrfToken) {
        return res.status(403).send('Invalid CSRF token');
    }
    next();
}

export default csrfProtection;
