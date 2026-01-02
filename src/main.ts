import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function start() {
  try {
    const PORT = process.env.PORT ?? 3030;
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.setGlobalPrefix('api');

    // Apply global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());

    // Serve static files from the uploads directory
    app.useStaticAssets(join(__dirname, '../../uploads'), {
      prefix: '/uploads',
    });

    const config = new DocumentBuilder()
      .setTitle('Bosma.uz - Print-on-Demand Platform')
      .setDescription('RESTful API for Bosma.uz Print-on-Demand platform')
      .setVersion('1.0')
      .addTag('Print-on-Demand, Design Upload, Custom Printing, E-commerce')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    await app.listen(PORT, () => {
      console.log(`✅ Bosma.uz Server started at: http://localhost:${PORT}`);
      console.log(
        `📚 Swagger documentation available at: http://localhost:${PORT}/api/docs`,
      );
    });
  } catch (error) {
    console.log(error);
  }
}

start();
