import { Request, Response, NextFunction } from 'express';
import { Farm, SoilReport, User } from '../../index.js';
import Helper from './FarmHelper.js';

export const getFarms = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as any;
  try {
    const farms = await Farm.findAll({
      where: { farmerId: user.id },
      include: [{
        model: SoilReport,
        as: 'soilReports',
        separate: true,
        order: [['createdAt', 'DESC']]
      }],
      order: [['createdAt', 'DESC']]
    });
    return res.json(farms.map(Helper.formatFarm));
  } catch (err) {
    return next(err);
  }
};

export const createFarm = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as any;
  const { 
    name, 
    latitude, 
    longitude, 
    area_acres, 
    crop_type, 
    address,
    state,
    district,
    ph,
    nitrogen,
    phosphorus,
    potassium,
    organic_carbon,
    ec
  } = req.body;

  if (!name || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Name, latitude, and longitude are required.' });
  }

  try {
    const farm = await Farm.create({
      farmerId: user.id,
      name,
      latitude: Number(latitude),
      longitude: Number(longitude),
      areaAcres: area_acres ? Number(area_acres) : null,
      cropType: crop_type || null,
      address: address || null,
      state: state || null,
      district: district || null
    });


    const hasSoilData = [ph, nitrogen, phosphorus, potassium, organic_carbon, ec].some(
      val => val !== undefined && val !== null && val !== ''
    );

    let initialReport = null;
    if (hasSoilData) {
      initialReport = await SoilReport.create({
        farmerId: user.id,
        farmId: farm.id,
        sourceType: 'manual',
        ph: ph !== undefined && ph !== '' ? Number(ph) : null,
        nitrogen: nitrogen !== undefined && nitrogen !== '' ? Number(nitrogen) : null,
        phosphorus: phosphorus !== undefined && phosphorus !== '' ? Number(phosphorus) : null,
        potassium: potassium !== undefined && potassium !== '' ? Number(potassium) : null,
        organicCarbon: organic_carbon !== undefined && organic_carbon !== '' ? Number(organic_carbon) : null,
        ec: ec !== undefined && ec !== '' ? Number(ec) : null
      });
    }

    const farmJson = farm.toJSON() as any;
    farmJson.soilReports = initialReport ? [initialReport] : [];

    return res.status(201).json(Helper.formatFarm(farmJson));
  } catch (err) {
    return next(err);
  }
};

export const updateFarm = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as any;
  const { id } = req.params;
  const { name, latitude, longitude, area_acres, crop_type, address, state, district } = req.body;

  try {
    const farm = await Farm.findByPk(id, {
      include: [{
        model: SoilReport,
        as: 'soilReports',
        separate: true,
        order: [['createdAt', 'DESC']]
      }]
    });
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found.' });
    }

    if (farm.farmerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to modify this farm.' });
    }

    if (name) farm.name = name;
    if (latitude !== undefined) farm.latitude = Number(latitude);
    if (longitude !== undefined) farm.longitude = Number(longitude);
    if (area_acres !== undefined) farm.areaAcres = area_acres ? Number(area_acres) : null;
    if (crop_type !== undefined) farm.cropType = crop_type || null;
    if (address !== undefined) farm.address = address || null;
    if (state !== undefined) farm.state = state || null;
    if (district !== undefined) farm.district = district || null;

    await farm.save();
    return res.json(Helper.formatFarm(farm));
  } catch (err) {
    return next(err);
  }
};

export const deleteFarm = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as any;
  const { id } = req.params;

  try {
    const farm = await Farm.findByPk(id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found.' });
    }

    if (farm.farmerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to delete this farm.' });
    }

    await farm.destroy();
    return res.json({ success: true, message: 'Farm deleted successfully.' });
  } catch (err) {
    return next(err);
  }
};

export const addSoilReport = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as any;
  const { id } = req.params;
  const { ph, nitrogen, phosphorus, potassium, organic_carbon, ec } = req.body;

  try {
    const farm = await Farm.findByPk(id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found.' });
    }

    if (farm.farmerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to add soil reports for this farm.' });
    }

    const report = await SoilReport.create({
      farmerId: user.id,
      farmId: farm.id,
      sourceType: 'manual',
      ph: ph !== undefined && ph !== '' ? Number(ph) : null,
      nitrogen: nitrogen !== undefined && nitrogen !== '' ? Number(nitrogen) : null,
      phosphorus: phosphorus !== undefined && phosphorus !== '' ? Number(phosphorus) : null,
      potassium: potassium !== undefined && potassium !== '' ? Number(potassium) : null,
      organicCarbon: organic_carbon !== undefined && organic_carbon !== '' ? Number(organic_carbon) : null,
      ec: ec !== undefined && ec !== '' ? Number(ec) : null
    });

    return res.status(201).json({
      success: true,
      message: 'Soil report added successfully.',
      data: {
        id: report.id,
        farm_id: report.farmId,
        source_type: report.sourceType,
        nitrogen: report.nitrogen,
        phosphorus: report.phosphorus,
        potassium: report.potassium,
        ph: report.ph,
        organic_carbon: report.organicCarbon,
        ec: report.ec,
        created_at: report.createdAt
      }
    });
  } catch (err) {
    return next(err);
  }
};

export default { getFarms, createFarm, updateFarm, deleteFarm, addSoilReport };
