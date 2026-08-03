import bcrypt from 'bcryptjs';
import { User } from '../components/index.js';
import logger from './logger.js';

export const seedAdmin = async (): Promise<void> => {
  try {
    const adminEmail = 'admin1@gmail.com';
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('123456', salt);

      await User.create({
        email: adminEmail,
        passwordHash,
        fullName: 'System Admin',
        role: 'admin',
        language: 'en',
        isVerified: true,
        verificationStatus: 'approved',
      });

      logger.info(`Default admin account seeded successfully: ${adminEmail}`);
    } else {
      logger.info(`Default admin account (${adminEmail}) already present.`);
    }
  } catch (err) {
    logger.error('Failed to seed default admin account on startup:', { error: err });
  }
};

export default seedAdmin;
