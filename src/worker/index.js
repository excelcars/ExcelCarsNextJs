const port = process.env.REDIS_PORT || "6379";
const host = process.env.REDIS_HOST || "redis";

console.log("ExcelCars worker placeholder started");
console.log(`Queue endpoint: ${host}:${port}`);
