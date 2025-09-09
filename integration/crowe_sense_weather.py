"""
CroweSense Weather Integration Module
Combines crowe-sense environmental sensing with MyceliumEI weather prediction
"""
import os
import asyncio
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta, timezone
import aiohttp
import numpy as np
from pydantic import BaseModel, Field
import structlog
from enum import Enum

logger = structlog.get_logger()

class SensorType(Enum):
    """Types of environmental sensors"""
    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"
    PRESSURE = "pressure"
    CO2 = "co2"
    LIGHT = "light"
    SOIL_MOISTURE = "soil_moisture"
    PH = "ph"
    EC = "electrical_conductivity"
    WIND = "wind"
    PRECIPITATION = "precipitation"

class WeatherDataSource(Enum):
    """Available weather data sources"""
    TOMORROW_IO = "tomorrow_io"
    OPENWEATHER = "openweather"
    NOAA = "noaa"
    CROWE_WEATHER = "crowe_weather"
    LOCAL_SENSORS = "local_sensors"

class SensorReading(BaseModel):
    """Individual sensor reading"""
    sensor_id: str
    sensor_type: SensorType
    value: float
    unit: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    location: Optional[Dict[str, float]] = None  # lat, lon, altitude
    quality_score: float = Field(default=1.0, ge=0, le=1)

class WeatherData(BaseModel):
    """Unified weather data model"""
    timestamp: datetime
    location: Dict[str, float]
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    pressure: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[float] = None
    precipitation: Optional[float] = None
    cloud_cover: Optional[float] = None
    uv_index: Optional[float] = None
    visibility: Optional[float] = None
    source: WeatherDataSource
    confidence: float = Field(default=1.0, ge=0, le=1)

class CroweSenseWeatherIntegration:
    """
    Unified weather and environmental sensing system
    Integrates CroweSense IoT sensors with multiple weather APIs
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.sensors = {}
        self.weather_sources = {}
        self.data_buffer = []
        self.prediction_models = {}
        
        # Initialize weather API connections
        self.apis = {
            WeatherDataSource.TOMORROW_IO: {
                "base_url": "https://api.tomorrow.io/v4",
                "api_key": config.get("TOMORROW_API_KEY")
            },
            WeatherDataSource.OPENWEATHER: {
                "base_url": "https://api.openweathermap.org/data/2.5",
                "api_key": config.get("OPENWEATHER_API_KEY")
            },
            WeatherDataSource.CROWE_WEATHER: {
                "base_url": config.get("CROWE_WEATHER_URL", "http://localhost:8200"),
                "api_key": config.get("CROWE_WEATHER_KEY")
            }
        }
        
        # Sensor calibration data
        self.calibration = {
            SensorType.TEMPERATURE: {"offset": 0.0, "scale": 1.0},
            SensorType.HUMIDITY: {"offset": 0.0, "scale": 1.0},
            SensorType.CO2: {"offset": 0.0, "scale": 1.0},
            SensorType.PH: {"offset": 0.0, "scale": 1.0}
        }
    
    async def initialize(self):
        """Initialize the integration system"""
        try:
            # Discover and connect to CroweSense sensors
            await self.discover_sensors()
            
            # Initialize weather API connections
            await self.validate_weather_apis()
            
            # Load prediction models
            await self.load_prediction_models()
            
            logger.info("CroweSense Weather Integration initialized",
                       sensors=len(self.sensors),
                       weather_sources=len(self.weather_sources))
            
        except Exception as e:
            logger.error(f"Failed to initialize CroweSense Weather Integration: {e}")
            raise
    
    async def discover_sensors(self):
        """Discover available CroweSense IoT sensors"""
        try:
            # Simulate sensor discovery (in production, this would use actual IoT protocols)
            discovered_sensors = [
                {"id": "CS001", "type": SensorType.TEMPERATURE, "location": {"lat": 40.7128, "lon": -74.0060}},
                {"id": "CS002", "type": SensorType.HUMIDITY, "location": {"lat": 40.7128, "lon": -74.0060}},
                {"id": "CS003", "type": SensorType.CO2, "location": {"lat": 40.7128, "lon": -74.0060}},
                {"id": "CS004", "type": SensorType.SOIL_MOISTURE, "location": {"lat": 40.7128, "lon": -74.0060}},
                {"id": "CS005", "type": SensorType.PH, "location": {"lat": 40.7128, "lon": -74.0060}},
                {"id": "CS006", "type": SensorType.LIGHT, "location": {"lat": 40.7128, "lon": -74.0060}}
            ]
            
            for sensor_info in discovered_sensors:
                self.sensors[sensor_info["id"]] = sensor_info
                logger.info(f"Discovered sensor: {sensor_info['id']} ({sensor_info['type'].value})")
            
        except Exception as e:
            logger.error(f"Sensor discovery failed: {e}")
    
    async def validate_weather_apis(self):
        """Validate and activate available weather APIs"""
        for source, api_config in self.apis.items():
            if api_config.get("api_key"):
                if await self.test_weather_api(source, api_config):
                    self.weather_sources[source] = api_config
                    logger.info(f"Weather source activated: {source.value}")
                else:
                    logger.warning(f"Weather source unavailable: {source.value}")
    
    async def test_weather_api(self, source: WeatherDataSource, config: Dict) -> bool:
        """Test if a weather API is accessible"""
        try:
            async with aiohttp.ClientSession() as session:
                # Test with a simple request
                test_location = {"lat": 40.7128, "lon": -74.0060}
                
                if source == WeatherDataSource.TOMORROW_IO:
                    url = f"{config['base_url']}/weather/realtime"
                    params = {
                        "location": f"{test_location['lat']},{test_location['lon']}",
                        "apikey": config['api_key']
                    }
                    async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=5)) as response:
                        return response.status == 200
                
                elif source == WeatherDataSource.OPENWEATHER:
                    url = f"{config['base_url']}/weather"
                    params = {
                        "lat": test_location['lat'],
                        "lon": test_location['lon'],
                        "appid": config['api_key']
                    }
                    async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=5)) as response:
                        return response.status == 200
                
                return False
                
        except Exception as e:
            logger.debug(f"API test failed for {source.value}: {e}")
            return False
    
    async def load_prediction_models(self):
        """Load weather prediction models"""
        self.prediction_models = {
            "short_term": ShortTermWeatherModel(),
            "long_term": LongTermWeatherModel(),
            "mycological": MycologicalWeatherModel()
        }
        
        for name, model in self.prediction_models.items():
            await model.initialize()
            logger.info(f"Loaded prediction model: {name}")
    
    async def read_sensor(self, sensor_id: str) -> Optional[SensorReading]:
        """Read data from a specific sensor"""
        if sensor_id not in self.sensors:
            logger.error(f"Unknown sensor: {sensor_id}")
            return None
        
        sensor_info = self.sensors[sensor_id]
        
        try:
            # Simulate sensor reading (in production, this would use actual sensor protocols)
            value = await self.simulate_sensor_reading(sensor_info["type"])
            
            # Apply calibration
            calibrated_value = self.apply_calibration(sensor_info["type"], value)
            
            reading = SensorReading(
                sensor_id=sensor_id,
                sensor_type=sensor_info["type"],
                value=calibrated_value,
                unit=self.get_unit(sensor_info["type"]),
                location=sensor_info.get("location"),
                quality_score=0.95  # Simulated quality
            )
            
            # Store in buffer
            self.data_buffer.append(reading)
            if len(self.data_buffer) > 1000:
                self.data_buffer = self.data_buffer[-1000:]  # Keep last 1000 readings
            
            return reading
            
        except Exception as e:
            logger.error(f"Failed to read sensor {sensor_id}: {e}")
            return None
    
    async def simulate_sensor_reading(self, sensor_type: SensorType) -> float:
        """Simulate sensor readings for testing"""
        import random
        
        ranges = {
            SensorType.TEMPERATURE: (15, 30),
            SensorType.HUMIDITY: (40, 80),
            SensorType.CO2: (350, 600),
            SensorType.SOIL_MOISTURE: (20, 60),
            SensorType.PH: (5.5, 7.5),
            SensorType.LIGHT: (10000, 50000),
            SensorType.PRESSURE: (980, 1030),
            SensorType.EC: (1.0, 3.0)
        }
        
        min_val, max_val = ranges.get(sensor_type, (0, 100))
        return random.uniform(min_val, max_val)
    
    def apply_calibration(self, sensor_type: SensorType, raw_value: float) -> float:
        """Apply calibration to raw sensor reading"""
        if sensor_type in self.calibration:
            cal = self.calibration[sensor_type]
            return (raw_value * cal["scale"]) + cal["offset"]
        return raw_value
    
    def get_unit(self, sensor_type: SensorType) -> str:
        """Get unit for sensor type"""
        units = {
            SensorType.TEMPERATURE: "°C",
            SensorType.HUMIDITY: "%",
            SensorType.CO2: "ppm",
            SensorType.SOIL_MOISTURE: "%",
            SensorType.PH: "pH",
            SensorType.LIGHT: "lux",
            SensorType.PRESSURE: "hPa",
            SensorType.EC: "mS/cm",
            SensorType.WIND: "m/s",
            SensorType.PRECIPITATION: "mm"
        }
        return units.get(sensor_type, "")
    
    async def get_weather_data(self, location: Dict[str, float], 
                              sources: Optional[List[WeatherDataSource]] = None) -> List[WeatherData]:
        """Get weather data from multiple sources"""
        if sources is None:
            sources = list(self.weather_sources.keys())
        
        weather_data = []
        
        for source in sources:
            if source in self.weather_sources:
                data = await self.fetch_weather_from_source(source, location)
                if data:
                    weather_data.append(data)
        
        return weather_data
    
    async def fetch_weather_from_source(self, source: WeatherDataSource, 
                                       location: Dict[str, float]) -> Optional[WeatherData]:
        """Fetch weather data from a specific source"""
        try:
            config = self.weather_sources[source]
            
            async with aiohttp.ClientSession() as session:
                if source == WeatherDataSource.TOMORROW_IO:
                    return await self.fetch_tomorrow_io(session, config, location)
                elif source == WeatherDataSource.OPENWEATHER:
                    return await self.fetch_openweather(session, config, location)
                elif source == WeatherDataSource.CROWE_WEATHER:
                    return await self.fetch_crowe_weather(session, config, location)
                    
        except Exception as e:
            logger.error(f"Failed to fetch weather from {source.value}: {e}")
            return None
    
    async def fetch_tomorrow_io(self, session: aiohttp.ClientSession, 
                               config: Dict, location: Dict[str, float]) -> Optional[WeatherData]:
        """Fetch weather from Tomorrow.io API"""
        url = f"{config['base_url']}/weather/realtime"
        params = {
            "location": f"{location['lat']},{location['lon']}",
            "apikey": config['api_key'],
            "units": "metric"
        }
        
        async with session.get(url, params=params) as response:
            if response.status == 200:
                data = await response.json()
                values = data.get("data", {}).get("values", {})
                
                return WeatherData(
                    timestamp=datetime.now(timezone.utc),
                    location=location,
                    temperature=values.get("temperature"),
                    humidity=values.get("humidity"),
                    pressure=values.get("pressureSurfaceLevel"),
                    wind_speed=values.get("windSpeed"),
                    wind_direction=values.get("windDirection"),
                    precipitation=values.get("precipitationIntensity"),
                    cloud_cover=values.get("cloudCover"),
                    uv_index=values.get("uvIndex"),
                    visibility=values.get("visibility"),
                    source=WeatherDataSource.TOMORROW_IO,
                    confidence=0.9
                )
        return None
    
    async def fetch_openweather(self, session: aiohttp.ClientSession,
                               config: Dict, location: Dict[str, float]) -> Optional[WeatherData]:
        """Fetch weather from OpenWeather API"""
        url = f"{config['base_url']}/weather"
        params = {
            "lat": location['lat'],
            "lon": location['lon'],
            "appid": config['api_key'],
            "units": "metric"
        }
        
        async with session.get(url, params=params) as response:
            if response.status == 200:
                data = await response.json()
                
                return WeatherData(
                    timestamp=datetime.now(timezone.utc),
                    location=location,
                    temperature=data.get("main", {}).get("temp"),
                    humidity=data.get("main", {}).get("humidity"),
                    pressure=data.get("main", {}).get("pressure"),
                    wind_speed=data.get("wind", {}).get("speed"),
                    wind_direction=data.get("wind", {}).get("deg"),
                    cloud_cover=data.get("clouds", {}).get("all"),
                    visibility=data.get("visibility"),
                    source=WeatherDataSource.OPENWEATHER,
                    confidence=0.85
                )
        return None
    
    async def fetch_crowe_weather(self, session: aiohttp.ClientSession,
                                 config: Dict, location: Dict[str, float]) -> Optional[WeatherData]:
        """Fetch weather from Crowe Weather Service"""
        url = f"{config['base_url']}/api/weather/current"
        headers = {"X-API-Key": config['api_key']} if config.get('api_key') else {}
        params = {"lat": location['lat'], "lon": location['lon']}
        
        async with session.get(url, params=params, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                
                return WeatherData(
                    timestamp=datetime.now(timezone.utc),
                    location=location,
                    temperature=data.get("temperature"),
                    humidity=data.get("humidity"),
                    pressure=data.get("pressure"),
                    wind_speed=data.get("wind_speed"),
                    wind_direction=data.get("wind_direction"),
                    precipitation=data.get("precipitation"),
                    source=WeatherDataSource.CROWE_WEATHER,
                    confidence=0.95
                )
        return None
    
    async def aggregate_weather_data(self, weather_data: List[WeatherData]) -> WeatherData:
        """Aggregate weather data from multiple sources using weighted average"""
        if not weather_data:
            return None
        
        if len(weather_data) == 1:
            return weather_data[0]
        
        # Calculate weighted averages based on confidence scores
        total_confidence = sum(w.confidence for w in weather_data)
        
        aggregated = WeatherData(
            timestamp=datetime.now(timezone.utc),
            location=weather_data[0].location,
            source=WeatherDataSource.LOCAL_SENSORS,  # Mark as aggregated
            confidence=min(1.0, total_confidence / len(weather_data))
        )
        
        # Aggregate each field
        fields = ['temperature', 'humidity', 'pressure', 'wind_speed', 'wind_direction',
                 'precipitation', 'cloud_cover', 'uv_index', 'visibility']
        
        for field in fields:
            values = [(getattr(w, field), w.confidence) for w in weather_data if getattr(w, field) is not None]
            if values:
                weighted_sum = sum(v * c for v, c in values)
                weight_sum = sum(c for _, c in values)
                setattr(aggregated, field, weighted_sum / weight_sum if weight_sum > 0 else None)
        
        return aggregated
    
    async def predict_weather(self, location: Dict[str, float], 
                            hours_ahead: int = 24) -> Dict[str, Any]:
        """Predict weather using ensemble of models"""
        # Get current weather data
        current_weather = await self.get_weather_data(location)
        aggregated = await self.aggregate_weather_data(current_weather)
        
        # Get recent sensor readings
        recent_sensors = self.data_buffer[-100:] if self.data_buffer else []
        
        predictions = {}
        
        # Run each prediction model
        for name, model in self.prediction_models.items():
            prediction = await model.predict(
                current_weather=aggregated,
                sensor_data=recent_sensors,
                hours_ahead=hours_ahead
            )
            predictions[name] = prediction
        
        # Ensemble prediction
        ensemble = self.ensemble_predictions(predictions)
        
        return {
            "location": location,
            "current": aggregated.dict() if aggregated else None,
            "predictions": predictions,
            "ensemble": ensemble,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "hours_ahead": hours_ahead
        }
    
    def ensemble_predictions(self, predictions: Dict[str, Any]) -> Dict[str, Any]:
        """Combine predictions from multiple models"""
        ensemble = {}
        
        # Simple average for now (can be improved with weighted voting)
        for key in ['temperature', 'humidity', 'precipitation_probability']:
            values = [p.get(key) for p in predictions.values() if p.get(key) is not None]
            if values:
                ensemble[key] = sum(values) / len(values)
        
        # Confidence based on agreement
        ensemble['confidence'] = self.calculate_ensemble_confidence(predictions)
        
        return ensemble
    
    def calculate_ensemble_confidence(self, predictions: Dict[str, Any]) -> float:
        """Calculate confidence based on model agreement"""
        if len(predictions) < 2:
            return 0.5
        
        # Calculate standard deviation of predictions
        temp_values = [p.get('temperature', 0) for p in predictions.values()]
        if temp_values:
            std_dev = np.std(temp_values)
            # Lower std dev = higher confidence
            confidence = max(0.3, min(1.0, 1.0 - (std_dev / 10)))
            return confidence
        
        return 0.5
    
    async def get_mycological_conditions(self, location: Dict[str, float]) -> Dict[str, Any]:
        """Get weather conditions optimized for mycological growth"""
        # Get current weather
        weather_data = await self.get_weather_data(location)
        current = await self.aggregate_weather_data(weather_data)
        
        # Get sensor readings
        sensor_readings = {}
        for sensor_id in self.sensors:
            reading = await self.read_sensor(sensor_id)
            if reading:
                sensor_readings[reading.sensor_type.value] = reading.value
        
        # Calculate mycological favorability
        favorability = self.calculate_mycological_favorability(current, sensor_readings)
        
        # Get predictions
        predictions = await self.predict_weather(location, hours_ahead=72)
        
        # Generate recommendations
        recommendations = self.generate_mycological_recommendations(
            current, sensor_readings, favorability, predictions
        )
        
        return {
            "location": location,
            "current_conditions": current.dict() if current else None,
            "sensor_readings": sensor_readings,
            "favorability_score": favorability,
            "predictions": predictions,
            "recommendations": recommendations,
            "optimal_species": self.suggest_optimal_species(favorability),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def calculate_mycological_favorability(self, weather: Optional[WeatherData], 
                                          sensors: Dict[str, float]) -> Dict[str, float]:
        """Calculate favorability for mycological growth"""
        scores = {}
        
        # Temperature favorability (optimal: 18-25°C)
        if weather and weather.temperature is not None:
            temp = weather.temperature
            if 18 <= temp <= 25:
                scores['temperature'] = 1.0
            elif 15 <= temp <= 28:
                scores['temperature'] = 0.7
            else:
                scores['temperature'] = max(0, 1 - abs(temp - 21.5) / 20)
        
        # Humidity favorability (optimal: 70-85%)
        if weather and weather.humidity is not None:
            humidity = weather.humidity
            if 70 <= humidity <= 85:
                scores['humidity'] = 1.0
            elif 60 <= humidity <= 90:
                scores['humidity'] = 0.7
            else:
                scores['humidity'] = max(0, 1 - abs(humidity - 77.5) / 30)
        
        # CO2 favorability (optimal: 500-1000 ppm)
        if 'co2' in sensors:
            co2 = sensors['co2']
            if 500 <= co2 <= 1000:
                scores['co2'] = 1.0
            elif 400 <= co2 <= 1500:
                scores['co2'] = 0.7
            else:
                scores['co2'] = max(0, 1 - abs(co2 - 750) / 1000)
        
        # Overall score
        if scores:
            scores['overall'] = sum(scores.values()) / len(scores)
        else:
            scores['overall'] = 0.5
        
        return scores
    
    def generate_mycological_recommendations(self, weather: Optional[WeatherData],
                                            sensors: Dict[str, float],
                                            favorability: Dict[str, float],
                                            predictions: Dict[str, Any]) -> List[str]:
        """Generate recommendations for mycological cultivation"""
        recommendations = []
        
        # Temperature recommendations
        if favorability.get('temperature', 0) < 0.7:
            if weather and weather.temperature:
                if weather.temperature < 18:
                    recommendations.append("Consider heating to reach optimal temperature (18-25°C)")
                elif weather.temperature > 25:
                    recommendations.append("Consider cooling or increased ventilation")
        
        # Humidity recommendations
        if favorability.get('humidity', 0) < 0.7:
            if weather and weather.humidity:
                if weather.humidity < 70:
                    recommendations.append("Increase humidity through misting or humidifiers")
                elif weather.humidity > 85:
                    recommendations.append("Improve ventilation to reduce excess humidity")
        
        # CO2 recommendations
        if 'co2' in sensors:
            co2 = sensors['co2']
            if co2 < 500:
                recommendations.append("CO2 levels low - reduce ventilation during colonization")
            elif co2 > 1000:
                recommendations.append("CO2 levels high - increase fresh air exchange for fruiting")
        
        # Predictive recommendations
        if predictions and predictions.get('ensemble'):
            ensemble = predictions['ensemble']
            if ensemble.get('precipitation_probability', 0) > 0.7:
                recommendations.append("High precipitation expected - ensure proper drainage")
            if ensemble.get('temperature'):
                future_temp = ensemble['temperature']
                if abs(future_temp - 21.5) > 5:
                    recommendations.append(f"Temperature changes expected ({future_temp:.1f}°C) - prepare climate control")
        
        if not recommendations:
            recommendations.append("Conditions are optimal for mycological cultivation")
        
        return recommendations
    
    def suggest_optimal_species(self, favorability: Dict[str, float]) -> List[Dict[str, Any]]:
        """Suggest optimal mushroom species based on conditions"""
        overall_score = favorability.get('overall', 0.5)
        
        species_suggestions = []
        
        if overall_score > 0.8:
            species_suggestions.extend([
                {"species": "Pleurotus ostreatus", "common_name": "Oyster Mushroom", "suitability": 0.95},
                {"species": "Lentinula edodes", "common_name": "Shiitake", "suitability": 0.90},
                {"species": "Ganoderma lucidum", "common_name": "Reishi", "suitability": 0.85}
            ])
        elif overall_score > 0.6:
            species_suggestions.extend([
                {"species": "Pleurotus eryngii", "common_name": "King Oyster", "suitability": 0.80},
                {"species": "Hericium erinaceus", "common_name": "Lion's Mane", "suitability": 0.75}
            ])
        else:
            species_suggestions.extend([
                {"species": "Pleurotus ostreatus", "common_name": "Oyster Mushroom", "suitability": 0.60},
                {"species": "Grifola frondosa", "common_name": "Maitake", "suitability": 0.55}
            ])
        
        return species_suggestions

class ShortTermWeatherModel:
    """Short-term weather prediction model (0-24 hours)"""
    
    async def initialize(self):
        """Initialize the model"""
        pass
    
    async def predict(self, current_weather: WeatherData, 
                     sensor_data: List[SensorReading],
                     hours_ahead: int) -> Dict[str, Any]:
        """Make short-term prediction"""
        if not current_weather:
            return {}
        
        # Simple linear extrapolation for demo
        prediction = {
            "temperature": current_weather.temperature,
            "humidity": current_weather.humidity,
            "precipitation_probability": 0.3 if current_weather.humidity and current_weather.humidity > 80 else 0.1,
            "confidence": 0.8 if hours_ahead <= 6 else 0.6
        }
        
        # Adjust based on trends in sensor data
        if sensor_data:
            recent_temps = [r.value for r in sensor_data[-10:] if r.sensor_type == SensorType.TEMPERATURE]
            if len(recent_temps) > 2:
                trend = (recent_temps[-1] - recent_temps[0]) / len(recent_temps)
                prediction["temperature"] = current_weather.temperature + (trend * hours_ahead)
        
        return prediction

class LongTermWeatherModel:
    """Long-term weather prediction model (24-168 hours)"""
    
    async def initialize(self):
        """Initialize the model"""
        pass
    
    async def predict(self, current_weather: WeatherData,
                     sensor_data: List[SensorReading],
                     hours_ahead: int) -> Dict[str, Any]:
        """Make long-term prediction"""
        # Simplified seasonal adjustment
        prediction = {
            "temperature": 20.0,  # Default to moderate
            "humidity": 65.0,
            "precipitation_probability": 0.4,
            "confidence": max(0.3, 0.7 - (hours_ahead / 168))
        }
        
        if current_weather:
            # Regress toward seasonal mean
            prediction["temperature"] = current_weather.temperature * 0.7 + 20.0 * 0.3
            prediction["humidity"] = current_weather.humidity * 0.6 + 65.0 * 0.4
        
        return prediction

class MycologicalWeatherModel:
    """Weather prediction model optimized for mycological applications"""
    
    async def initialize(self):
        """Initialize the model"""
        self.growth_parameters = {
            "optimal_temp": 22.0,
            "optimal_humidity": 75.0,
            "optimal_co2": 800.0
        }
    
    async def predict(self, current_weather: WeatherData,
                     sensor_data: List[SensorReading],
                     hours_ahead: int) -> Dict[str, Any]:
        """Make mycology-optimized prediction"""
        prediction = {
            "temperature": self.growth_parameters["optimal_temp"],
            "humidity": self.growth_parameters["optimal_humidity"],
            "growth_favorability": 0.5,
            "confidence": 0.7
        }
        
        if current_weather:
            # Predict conditions will trend toward optimal for growth
            alpha = 0.1 * (hours_ahead / 24)  # Adjustment factor
            prediction["temperature"] = current_weather.temperature * (1 - alpha) + self.growth_parameters["optimal_temp"] * alpha
            prediction["humidity"] = current_weather.humidity * (1 - alpha) + self.growth_parameters["optimal_humidity"] * alpha
            
            # Calculate growth favorability
            temp_score = 1.0 - abs(prediction["temperature"] - self.growth_parameters["optimal_temp"]) / 10
            humidity_score = 1.0 - abs(prediction["humidity"] - self.growth_parameters["optimal_humidity"]) / 20
            prediction["growth_favorability"] = (temp_score + humidity_score) / 2
        
        return prediction

# Integration with main orchestrator
async def integrate_crowe_sense_weather(orchestrator):
    """Integrate CroweSense Weather with the main orchestrator"""
    config = {
        "TOMORROW_API_KEY": os.getenv("TOMORROW_API_KEY"),
        "OPENWEATHER_API_KEY": os.getenv("OPENWEATHER_API_KEY"),
        "CROWE_WEATHER_URL": os.getenv("CROWE_WEATHER_URL", "http://localhost:8200"),
        "CROWE_WEATHER_KEY": os.getenv("CROWE_WEATHER_KEY")
    }
    
    crowe_sense = CroweSenseWeatherIntegration(config)
    await crowe_sense.initialize()
    
    # Register with orchestrator
    orchestrator.register_service("crowe_sense_weather", crowe_sense)
    
    logger.info("CroweSense Weather Integration registered with orchestrator")
    
    return crowe_sense