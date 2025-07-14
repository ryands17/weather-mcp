import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const WEATHER_API_URL = "https://api.openweathermap.org";

const env = z
  .object({
    WEATHER_API_KEY: z.string(),
  })
  .parse(process.env);

// Create server instance
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.registerTool(
  "fetch-weather",
  {
    title: "Weather fetcher",
    description: "Get weather data for a city",
    inputSchema: { city: z.string() },
  },
  async ({ city: location }) => {
    const { lat, lng } = await fetchLocationCoordinates(location);
    if (!lat || !lng) {
      return {
        content: [{ type: "text", text: "Failed to retrieve weather info" }],
      };
    }

    const weatherInfo = await fetchCurrentWeather(lat, lng);
    const text = `Current weather in ${weatherInfo.name} is ${weatherInfo.weather[0]?.description} with a temperature of ${weatherInfo.main.temp} and it feels like ${weatherInfo.main.feels_like}.`;

    return {
      content: [{ type: "text", text }],
    };
  },
);

server.registerTool(
  "fetch-forecast",
  {
    title: "Weather forecast",
    description: "Get the weather for a specific location in a 3 hour interval",
    inputSchema: {
      location: z.string(),
      count: z.number().min(5).max(20).default(5),
    },
  },
  async ({ location, count }) => {
    const { lat, lng } = await fetchLocationCoordinates(location);
    if (!lat || !lng) {
      return {
        content: [{ type: "text", text: "Failed to retrieve weather info" }],
      };
    }

    const forecastInfo = await fetchWeatherForecast(lat, lng, count);
    const text = forecastInfo.list.map((val) => {
      return `For time: ${val.dt_txt}: The temperature is ${val.main.temp} and it feels like ${val.main.feels_like}.
The minimum temperature will be ${val.main.temp_min} and the max will go to ${val.main.temp_max}.`;
    });

    return {
      content: [
        {
          type: "text",
          text: `Here is the next ${count} iterations forecast for ${forecastInfo.city.name}:
${text.join("\n")}
`,
        },
      ],
    };
  },
);

const CurrentWeatherResponseSchema = z.object({
  coord: z.object({ lon: z.number(), lat: z.number() }).required(),
  weather: z.array(
    z
      .object({
        id: z.number(),
        main: z.string(),
        description: z.string(),
        icon: z.string(),
      })
      .required(),
  ),
  base: z.string(),
  main: z
    .object({
      temp: z.number(),
      feels_like: z.number(),
      temp_min: z.number(),
      temp_max: z.number(),
      pressure: z.number(),
      humidity: z.number(),
      sea_level: z.number(),
      grnd_level: z.number(),
    })
    .required(),
  name: z.string(),
});

async function fetchCurrentWeather(lat: number, lng: number) {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    appid: env.WEATHER_API_KEY,
    units: "metric",
  });
  const response = await fetch(`${WEATHER_API_URL}/data/2.5/weather?${params}`);

  const data = CurrentWeatherResponseSchema.parse(await response.json());
  return data;
}

const WeatherForecastResponseSchema = z.object({
  list: z.array(
    z.object({
      dt: z.number(),
      main: z.object({
        temp: z.number(),
        feels_like: z.number(),
        temp_min: z.number(),
        temp_max: z.number(),
      }),
      weather: z.array(
        z.object({
          id: z.number(),
          main: z.string(),
          description: z.string(),
          icon: z.string(),
        }),
      ),
      dt_txt: z.string(),
    }),
  ),
  city: z.object({
    id: z.number(),
    name: z.string(),
    coord: z.object({ lat: z.number(), lon: z.number() }),
    country: z.string(),
    population: z.number(),
    timezone: z.number(),
    sunrise: z.number(),
    sunset: z.number(),
  }),
});

async function fetchWeatherForecast(lat: number, lng: number, count: number) {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    appid: env.WEATHER_API_KEY,
    units: "metric",
    cnt: count.toString(),
  });

  const response = await fetch(
    `${WEATHER_API_URL}/data/2.5/forecast?${params}`,
  );
  const data = WeatherForecastResponseSchema.parse(await response.json());

  return data;
}

const LocationCoordinatesResponseSchema = z.array(
  z.object({
    name: z.string(),
    lat: z.number(),
    lon: z.number(),
    country: z.string(),
    state: z.string(),
  }),
);

async function fetchLocationCoordinates(location: string) {
  const response = await fetch(
    `${WEATHER_API_URL}/geo/1.0/direct?q=${location}&limit=1&appid=${env.WEATHER_API_KEY}`,
  );

  const data = LocationCoordinatesResponseSchema.parse(await response.json());
  return { lat: data[0]?.lat, lng: data[0]?.lon };
}

try {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Weather mcp server running on stdio");
} catch (error) {
  console.error("Failed to run mcp server", error);
}
