"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrisma = void 0;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = __importDefault(require("pg"));
let prisma;
const getPrisma = (databaseUrl) => {
    if (prisma)
        return prisma;
    const pool = new pg_1.default.Pool({ connectionString: databaseUrl });
    const adapter = new adapter_pg_1.PrismaPg(pool);
    prisma = new client_1.PrismaClient({ adapter });
    return prisma;
};
exports.getPrisma = getPrisma;
// Default export for backward compatibility, but in Workers we should use getPrisma(env.DATABASE_URL)
exports.default = prisma;
