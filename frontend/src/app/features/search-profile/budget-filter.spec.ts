import {
  budgetChipLabel,
  budgetDirection,
  budgetDirectionFor,
  budgetValue,
  normalizeBudget,
} from './budget-filter';

describe('budget-filter — sentido del filtro de presupuesto', () => {
  describe('budgetDirectionFor', () => {
    it('listar personas que buscan piso pide un presupuesto mínimo', () => {
      expect(budgetDirectionFor('looking_for_flat', null)).toBe('min');
      expect(budgetDirectionFor('looking_for_flat', 'looking_for_flat')).toBe('min');
    });

    it('listar habitaciones pide un precio máximo', () => {
      expect(budgetDirectionFor('looking_for_roommate', null)).toBe('max');
      expect(budgetDirectionFor('looking_for_roommate', 'looking_for_roommate')).toBe('max');
    });

    it('sin tipo elegido, quien ofrece habitación busca personas: presupuesto mínimo', () => {
      expect(budgetDirectionFor(null, 'looking_for_roommate')).toBe('min');
    });

    it('sin tipo elegido, quien busca piso busca habitaciones: precio máximo', () => {
      expect(budgetDirectionFor(null, 'looking_for_flat')).toBe('max');
    });

    it('sin tipo ni perfil propio conserva el comportamiento anterior (máximo)', () => {
      expect(budgetDirectionFor(null, null)).toBe('max');
    });
  });

  describe('budgetDirection', () => {
    it('un parámetro ya presente manda sobre el tipo, para describir el filtro aplicado', () => {
      expect(budgetDirection({ budget_max: 600, profile_type: 'looking_for_flat' }, null)).toBe(
        'max'
      );
      expect(budgetDirection({ budget_min: 600, profile_type: 'looking_for_roommate' }, null)).toBe(
        'min'
      );
    });

    it('sin importe, se deduce del tipo elegido y del perfil propio', () => {
      expect(budgetDirection({}, 'looking_for_roommate')).toBe('min');
      expect(
        budgetDirection({ profile_type: 'looking_for_roommate' }, 'looking_for_roommate')
      ).toBe('max');
    });
  });

  it('budgetValue lee el importe de cualquiera de los dos parámetros', () => {
    expect(budgetValue({ budget_min: 700 })).toBe(700);
    expect(budgetValue({ budget_max: 650 })).toBe(650);
    expect(budgetValue({})).toBeNull();
  });

  it('normalizeBudget anula el extremo neutro de cada sentido', () => {
    expect(normalizeBudget('min', 200)).toBeNull();
    expect(normalizeBudget('min', 250)).toBe(250);
    expect(normalizeBudget('max', 1500)).toBeNull();
    expect(normalizeBudget('max', 1450)).toBe(1450);
  });

  it('el chip dice hacia dónde compara', () => {
    expect(budgetChipLabel('max', 600)).toBe('Precio hasta 600 €');
    expect(budgetChipLabel('min', 600)).toBe('Presupuesto desde 600 €');
  });
});
