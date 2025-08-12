import { Injectable } from '@angular/core';
import PocketBase from 'pocketbase';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private pb = new PocketBase(environment.apiUrl);

  // Puedes cambiar esto a true para habilitar IA por defecto
  private usarOpenAI = true;

  get isAuthenticated(): boolean {
    return this.pb.authStore.isValid;
  }
  async obtenerMensajes(userId: string): Promise<any[]> {
    return await this.pb.collection('camiwaChatBot').getFullList({
      filter: `sessionId="${userId}"`,
      sort: '+timestamp'
    });
  }
  

  listenMensajes(userId: string, callback: (msg: any) => void) {
    this.pb.collection('camiwaChatBot').subscribe('*', event => {
      if (event.action === 'create' && event.record['sessionId'] === userId) {
        callback(event.record);
      }
    });
  }
  async obtenerRespuesta(mensaje: string): Promise<{ texto: string, botones?: any[] }> {
    const pregunta = mensaje.toLowerCase().trim();
  
    // 🔍 Lógica predefinida
    if ((pregunta.includes('cita') || pregunta.includes('agendar')) && !this.isAuthenticated) {
      return {
        texto: 'Para agendar una cita, por favor inicia sesión o crea una cuenta.',
      };
    }
  
    if (pregunta.includes('cita') || pregunta.includes('agendar')) {
      return {
        texto: 'Para agendar una cita, por favor indícame el día, hora y el tipo de profesional que necesitas.',
      };
    }
  
    if (pregunta.includes('servicio') || pregunta.includes('servicios')) {
      try {
        const categorias = await this.pb.collection('camiwaCategories').getFullList({
          filter: 'status = "active"',
          sort: 'name',
          fields: 'name',
        });
      
  
        const nombres = categorias.map((cat: any) => `• ${cat.name}`).join('\n');
        return {
          texto: `Estas son los servicios de salud disponibles:\n${nombres}`,
        };
      } catch (error) {
        console.error('Error cargando servicios:', error);
        return { texto: 'Lo siento, no pude obtener los servicios de salud en este momento.' };
      }
    }
    const regexCategoria = /especialidades.*(en|de)\s+(.*)/;
    const match = pregunta.match(regexCategoria);
    if (match && match[2]) {
      const nombreCategoria = match[2];
      const respuesta = await this.obtenerEspecialidadesPorCategoria(nombreCategoria);
      return { texto: respuesta };
}
if (pregunta.includes('especialidad')) {
  try {
    // Obtener todas las categorías activas
    const categoriasActivas = await this.pb.collection('camiwaCategories').getFullList({
      filter: 'status = "active"',
      fields: 'id,name',
    });

    const idsCategoriasActivas = categoriasActivas.map((cat: any) => cat.id);

    // Obtener todas las especialidades cuyo fatherId esté en las categorías activas
    const especialidades = await this.pb.collection('camiwaSpecialties').getFullList({
      filter: idsCategoriasActivas.map(id => `fatherId = "${id}"`).join(' || '),
      sort: 'name',
      fields: 'name,fatherId',
    });

    if (especialidades.length === 0) {
      return { texto: 'No hay especialidades disponibles actualmente.' };
    }

    // Agrupar por categoría
    const agrupadas: { [key: string]: string[] } = {};
    for (const esp of especialidades) {
      const cat = categoriasActivas.find(c => c.id === esp['fatherId']);
      if (cat) {
        if (!agrupadas[cat['name']]) agrupadas[cat['name']] = [];
        agrupadas[cat['name']].push(`• ${esp['name']}`);
      }
    }

    // Armar texto final
    let resultado = 'Estas son las especialidades médicas disponibles agrupadas por servicios:\n\n';
    for (const catName of Object.keys(agrupadas)) {
      resultado += `🩺 ${catName}:\n${agrupadas[catName].join('\n')}\n\n`;
    }

    return { texto: resultado.trim() };
  } catch (error) {
    console.error('Error cargando especialidades filtradas:', error);
    return { texto: 'No pude obtener las especialidades médicas en este momento.' };
  }
}

  
    if (pregunta.includes('profesional') || pregunta.includes('especialista')) {
      return {
        texto: 'Para ver a los profesionales disponibles, haz clic en el siguiente botón:',
        botones: [{ label: 'Ver especialistas', action: 'ver-especialistas' }]
      };
    }
    
  
    if (pregunta.includes('ayuda')) {
      return {
        texto: '¿En qué puedo ayudarte?',
        botones: ['Ver servicios de salud', 'Especialidades médicas', 'Agendar cita', 'Contactar profesional']
      };
    }
  
    // ✅ Si la IA está habilitada
    if (this.usarOpenAI) {
      const respuestaIA = await this.llamarOpenAI(pregunta);
      return { texto: respuestaIA };
    }
  
    // 🧱 Respuesta por defecto si no se entendió y no hay IA
    return {
      texto: 'Lo siento, no entendí tu mensaje. Puedes preguntarme por servicios de salud, especialidades médicas, agendar citas o contactar a un profesional.',
    };
  }
  async obtenerEspecialidadesPorCategoria(nombreCategoria: string): Promise<string> {
    try {
      // Buscar la categoría por nombre (insensible a mayúsculas)
      const categorias = await this.pb.collection('camiwaCategories').getFullList({
        filter: `status = "active" && lower(name) ~ "${nombreCategoria.toLowerCase()}"`,
      });
  
      if (!categorias.length) {
        return `No encontré una categoría activa con el nombre "${nombreCategoria}".`;
      }
  
      const categoria = categorias[0];
  
      const especialidades = await this.pb.collection('camiwaSpecialties').getFullList({
        filter: `fatherId = "${categoria.id}"`,
        sort: 'name',
      });
  
      if (!especialidades.length) {
        return `No hay especialidades registradas bajo la categoría "${categoria['name']}".`;
      }
  
      const nombres = especialidades.map(e => `• ${e['name']}`).join('\n');
      return `Estas son las especialidades disponibles en "${categoria['name']}":\n${nombres}`;
    } catch (err) {
      console.error('❌ Error obteniendo especialidades:', err);
      return 'Ocurrió un error al buscar las especialidades para esa categoría.';
    }
  }
  

  // 📡 Función para llamar a OpenAI
  private async llamarOpenAI(prompt: string): Promise<string> {
    const API_KEY = '2lE7VGPh4dRgpJ6KkoxmqiSQ3PkdCr7fye3zeWbrlg10a3mSQvGm3xgpK2xWzkIGqyFbUOUOvjT3BlbkFJIdl8m7DXeNLqUzNhqHUNHswCnbXxkBsUiEHcrhLuogpmeQjc8redwH9jBLuQ7xjHjoPywBkLEA'; // reemplaza por tu clave segura

    try {
      const respuesta = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Eres un asistente virtual de salud para una plataforma llamada Camiwa.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 200,
        }),
      });

      const data = await respuesta.json();
      return data?.choices?.[0]?.message?.content?.trim() || 'No pude generar una respuesta.';
    } catch (err) {
      console.error('❌ Error con OpenAI:', err);
      return 'Ocurrió un error al procesar tu solicitud con IA.';
    }
  }
}
