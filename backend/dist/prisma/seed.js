"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma = new client_1.PrismaClient();
function hashPassword(password) {
    return (0, crypto_1.createHash)('sha256').update(password).digest('hex');
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Start seeding ...');
        const hashedPassword = hashPassword('admin123');
        const superAdmin = yield prisma.user.upsert({
            where: { email: 'super@certiflow.com' },
            update: { password: hashedPassword },
            create: {
                email: 'super@certiflow.com',
                password: hashedPassword,
                role: 'SUPER_ADMIN',
                must_change_password: false,
            },
        });
        const genAdmin = yield prisma.user.upsert({
            where: { email: 'admin@certiflow.com' },
            update: { password: hashedPassword },
            create: {
                email: 'admin@certiflow.com',
                password: hashedPassword,
                role: 'GENERAL_ADMIN',
                must_change_password: false,
            },
        });
        const employeeUser = yield prisma.user.upsert({
            where: { email: 'somchai@certiflow.com' },
            update: { password: hashedPassword },
            create: {
                email: 'somchai@certiflow.com',
                password: hashedPassword,
                role: 'EMPLOYEE',
                must_change_password: false,
                employee: {
                    create: {
                        employee_id: 'EMP-10293',
                        first_name: 'Somchai',
                        last_name: 'Jaidee',
                        department: 'Engineering',
                        position: 'Software Developer',
                    },
                },
            },
        });
        console.log({ superAdmin, genAdmin, employeeUser });
        console.log('Seeding finished.');
    });
}
main()
    .then(() => prisma.$disconnect())
    .catch((e) => __awaiter(void 0, void 0, void 0, function* () {
    console.error(e);
    yield prisma.$disconnect();
    process.exit(1);
}));
