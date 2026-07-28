export const formatFarm = (farm: any) => {
  return {
    id: farm.id,
    farmer_id: farm.farmerId,
    name: farm.name,
    latitude: farm.latitude,
    longitude: farm.longitude,
    area_acres: farm.areaAcres,
    crop_type: farm.cropType,
    address: farm.address,
    state: farm.state,
    district: farm.district,
    created_at: farm.createdAt,
    updated_at: farm.updatedAt,
    soil_reports: farm.soilReports ? farm.soilReports.map((report: any) => ({
      id: report.id,
      source_type: report.sourceType,
      nitrogen: report.nitrogen,
      phosphorus: report.phosphorus,
      potassium: report.potassium,
      ph: report.ph,
      organic_carbon: report.organicCarbon,
      ec: report.ec,
      created_at: report.createdAt
    })) : []
  };
};

export default { formatFarm };
