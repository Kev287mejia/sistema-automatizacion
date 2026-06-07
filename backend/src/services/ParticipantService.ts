import { ParticipantRepository, Participant } from '../repositories/ParticipantRepository';

export class ParticipantService {
  private repository: ParticipantRepository;

  constructor() {
    this.repository = new ParticipantRepository();
  }

  async registerParticipant(data: Participant): Promise<Participant> {
    // 1. Validaciones de negocio simples
    if (!data.first_name || !data.last_name || !data.email) {
      throw new Error('Validación fallida: Nombre, Apellido y Email son obligatorios.');
    }

    // 2. Verificar si el email ya existe
    const existingEmail = await this.repository.findByEmail(data.email);
    if (existingEmail) {
      throw new Error('Validación fallida: Ya existe un participante registrado con este email.');
    }

    // 3. Verificar si el telegram_id ya existe (si fue provisto)
    if (data.telegram_id) {
      const existingTelegram = await this.repository.findByTelegramId(data.telegram_id);
      if (existingTelegram) {
        throw new Error('Validación fallida: Esta cuenta de Telegram ya está asociada a un participante.');
      }
    }

    // 4. Transformar/Sanitizar datos si es necesario (ej. email en minúsculas)
    const sanitizedData = {
      ...data,
      email: data.email.toLowerCase().trim()
    };

    // 5. Guardar en base de datos
    return await this.repository.create(sanitizedData);
  }
}
