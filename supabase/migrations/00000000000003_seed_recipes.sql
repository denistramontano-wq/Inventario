insert into recipes (id, name, description, instructions, prep_minutes) values
  (gen_random_uuid(), 'Pasta al pomodoro', 'Un classico veloce e sempre pronto', 'Cuoci la pasta. Scalda il pomodoro con aglio e olio, sala. Manteca la pasta nel sugo e servi con basilico.', 20),
  (gen_random_uuid(), 'Frittata di uova', 'Perfetta per svuotare il frigo', 'Sbatti le uova con sale e pepe. Cuoci in padella con olio a fuoco medio, gira e cuoci l''altro lato.', 15),
  (gen_random_uuid(), 'Riso al pomodoro', 'Comfort food semplice', 'Soffriggi cipolla, aggiungi riso e tosta. Versa il pomodoro e brodo poco alla volta mescolando fino a cottura.', 25),
  (gen_random_uuid(), 'Insalata di tonno', 'Piatto fresco e veloce', 'Mescola insalata, tonno, pomodoro e cipolla. Condisci con olio, sale e aceto.', 10),
  (gen_random_uuid(), 'Pasta con tonno e pomodoro', 'Piatto completo in 20 minuti', 'Cuoci la pasta. Soffriggi aglio, aggiungi pomodoro e tonno sgocciolato, cuoci 10 minuti. Manteca la pasta.', 20),
  (gen_random_uuid(), 'Pollo al limone', 'Secondo piatto leggero', 'Rosola il pollo in padella con olio, aggiungi succo di limone e sale, cuoci a fuoco basso fino a cottura.', 30),
  (gen_random_uuid(), 'Minestrone di verdure', 'Ricco di verdure di stagione', 'Taglia le verdure a cubetti, soffriggi cipolla, aggiungi le verdure e brodo, cuoci 30 minuti.', 40),
  (gen_random_uuid(), 'Toast con formaggio e prosciutto', 'Snack veloce', 'Farcisci il pane con formaggio e prosciutto, cuoci in padella o tostapane fino a doratura.', 8);

insert into recipe_ingredients (recipe_id, name, quantity, unit)
select r.id, i.name, i.quantity, i.unit from recipes r
join lateral (values
  ('Pasta al pomodoro', 'pasta', 320, 'g'), ('Pasta al pomodoro', 'pomodoro', 400, 'g'), ('Pasta al pomodoro', 'aglio', 1, 'pz'), ('Pasta al pomodoro', 'olio', 1, 'pz'), ('Pasta al pomodoro', 'basilico', 1, 'pz'),
  ('Frittata di uova', 'uova', 4, 'pz'), ('Frittata di uova', 'sale', 1, 'pz'), ('Frittata di uova', 'olio', 1, 'pz'),
  ('Riso al pomodoro', 'riso', 320, 'g'), ('Riso al pomodoro', 'pomodoro', 400, 'g'), ('Riso al pomodoro', 'cipolla', 1, 'pz'), ('Riso al pomodoro', 'brodo', 1, 'l'),
  ('Insalata di tonno', 'insalata', 1, 'pz'), ('Insalata di tonno', 'tonno', 160, 'g'), ('Insalata di tonno', 'pomodoro', 200, 'g'), ('Insalata di tonno', 'cipolla', 1, 'pz'),
  ('Pasta con tonno e pomodoro', 'pasta', 320, 'g'), ('Pasta con tonno e pomodoro', 'tonno', 160, 'g'), ('Pasta con tonno e pomodoro', 'pomodoro', 400, 'g'), ('Pasta con tonno e pomodoro', 'aglio', 1, 'pz'),
  ('Pollo al limone', 'pollo', 500, 'g'), ('Pollo al limone', 'limone', 1, 'pz'), ('Pollo al limone', 'olio', 1, 'pz'), ('Pollo al limone', 'sale', 1, 'pz'),
  ('Minestrone di verdure', 'carote', 2, 'pz'), ('Minestrone di verdure', 'patate', 2, 'pz'), ('Minestrone di verdure', 'cipolla', 1, 'pz'), ('Minestrone di verdure', 'brodo', 1, 'l'), ('Minestrone di verdure', 'zucchine', 2, 'pz'),
  ('Toast con formaggio e prosciutto', 'pane', 4, 'pz'), ('Toast con formaggio e prosciutto', 'formaggio', 100, 'g'), ('Toast con formaggio e prosciutto', 'prosciutto', 100, 'g')
) as i(recipe_name, name, quantity, unit) on i.recipe_name = r.name;
