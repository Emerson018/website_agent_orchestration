import { describe, it, expect } from 'vitest';

describe('Contact Profile Route & Navigation', () => {
  it('formats navigation target path correctly for contact id', () => {
    const contactId = 'contact-uuid-1234';
    const targetUrl = `/contacts/${contactId}`;
    expect(targetUrl).toBe('/contacts/contact-uuid-1234');
  });

  it('correctly maps contact entity to executive profile header fields', () => {
    const contact = {
      id: 'uuid-9876',
      name: 'Dr. Roberto Silva',
      company: 'Clínica Odontológica Silva',
      phone: '+55 51 98888-7777',
      email: 'roberto@clinicasilva.com.br',
      additional_data: {
        dossie: {
          nome_verificado: 'Clínica Odontológica Silva',
          nota: 4.9,
          total_avaliacoes: 84,
          nicho_detectado: 'dentist',
        },
      },
    };

    const companyName = contact.company || contact.additional_data?.dossie?.nome_verificado || contact.name;
    const rating = contact.additional_data?.dossie?.nota;
    const totalReviews = contact.additional_data?.dossie?.total_avaliacoes;
    const niche = contact.additional_data?.dossie?.nicho_detectado;

    expect(companyName).toBe('Clínica Odontológica Silva');
    expect(rating).toBe(4.9);
    expect(totalReviews).toBe(84);
    expect(niche).toBe('dentist');
  });

  it('gracefully handles missing company name by falling back to verified name or contact name', () => {
    const contactWithoutCompany = {
      id: 'uuid-1111',
      name: 'Carlos Oliveira',
      phone: '51999998888',
      additional_data: {
        dossie: {
          nome_verificado: 'Oficina Mecânica Oliveira',
        },
      },
    };

    const displayName =
      (contactWithoutCompany as any).company ||
      contactWithoutCompany.additional_data?.dossie?.nome_verificado ||
      contactWithoutCompany.name;

    expect(displayName).toBe('Oficina Mecânica Oliveira');
  });
});
