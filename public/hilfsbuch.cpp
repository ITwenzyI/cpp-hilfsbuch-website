



void HILFSBUCH::cpp_algorithmen() {
    std::cout << "\n=== STL-Algorithmen ===\n";

    std::cout << "-> sort(): Sortiert einen Bereich.\n";
    std::cout << "   Beispiel: std::sort(v.begin(), v.end());\n";

    std::cout << "-> reverse(): Dreht Reihenfolge um.\n";
    std::cout << "   Beispiel: std::reverse(v.begin(), v.end());\n";

    std::cout << "-> find(): Sucht ein Element.\n";
    std::cout << "   Beispiel: auto it = std::find(v.begin(), v.end(), 3);\n";

    std::cout << "-> count(): Zählt Anzahl eines Werts.\n";
    std::cout << "   Beispiel: int anzahl = std::count(v.begin(), v.end(), 2);\n";

    std::cout << "-> accumulate(): Summiert Bereich (aus <numeric>).\n";
    std::cout << "   Beispiel: (0=Startwert) int summe = std::accumulate(v.begin(), v.end(), 0);\n";

    std::cout << "-> all_of(): Prüft, ob alle ein Kriterium erfüllen.\n";
    std::cout << "   Beispiel: std::all_of(v.begin(), v.end(), [](int x) { return x > 0; });\n";

    std::cout << "-> for_each(): Führt Funktion für jedes Element aus.\n";
    std::cout << "   Beispiel: std::for_each(v.begin(), v.end(), [](int x) { std::cout << x; });\n";
}


void HILFSBUCH::cpp_templates() {
    std::cout << "\n=== Templates in C++ ===\n";

    std::cout << "-> Templates: Ermöglichen generischen Code.\n";
    std::cout << "   Beispiel:\n";
    std::cout << "   template<typename T>\n";
    std::cout << "   T add(T a, T b) {\n";
    std::cout << "       return a + b;\n";
    std::cout << "   }\n";
    std::cout << "   Aufruf: add<int>(3, 4);\n";
    std::cout << "-> Jetzt kannst du add() mit beliebigen Typen verwenden:\n";
    std::cout << "-> Der Compiler leitet den Typ oft selbst ab, also reicht auch:\n\n";

    std::cout << "-> Mehrere Typen:\n";
    std::cout << "-> Du kannst mehrere Typ-Parameter verwenden:\n";
    std::cout << "   template<typename T1, typename T2>\n";
    std::cout << "   void zeige(T1 a, T2 b) {\n";
    std::cout << "       std::cout << a << \", \" << b;\n";
    std::cout << "   }\n";
    std::cout << "   Aufruf: zeige<int, double>(5, 3.14); // explizit mit Typangabe\n";
    std::cout << "   Aufruf: zeige(\"Alter\", 25); // automatisch abgeleitet: T1 = const char*, T2 = int\n";
    std::cout << "   Aufruf: zeige<std::string, bool>(\"Fertig\", true); // mit std::string\n";
    std::cout << "->   Ausgabe: 5, 3.14\n\n";

    std::cout << "-> Template mit Klassen:\n";
    std::cout << "   template<class T>\n";
    std::cout << "   class Box {\n";
    std::cout << "       T inhalt;\n";
    std::cout << "   public:\n";
    std::cout << "       void set(T wert) { inhalt = wert; }\n";
    std::cout << "       T get() { return inhalt; }\n";
    std::cout << "   };\n";
    std::cout << "   Aufruf: Box<int> intBox;\n";
    std::cout << "   Aufruf: intBox.set(42);\n";
    std::cout << "   Aufruf: Box<std::string> stringBox;\n";
    std::cout << "   Aufruf: stringBox.set(\"Hallo\");\n";
    std::cout << "-> Der Typ T wird bei der Objekterstellung festgelegt.\n\n";
}


void HILFSBUCH::cpp_exceptions() {
    std::cout << "\n=== Fehlerbehandlung mit Exceptions ===\n";

    std::cout << "-> try-catch: Behandelt Ausnahmen.\n";
    std::cout << "   Beispiel:\n";
    std::cout << "   try {\n";
    std::cout << "       if (x == 0) throw std::runtime_error(\"Division durch 0\");\n";
    std::cout << "   } catch (const std::exception& e) {\n";
    std::cout << "       std::cout << e.what();\n";
    std::cout << "   }\n";

    std::cout << "-> throw: Löst Ausnahme aus.\n";
    std::cout << "   Beispiel: throw std::invalid_argument(\"Ungültiger Wert\");\n";

    std::cout << "-> Eigene Exception-Klasse:\n";
    std::cout << "   class MeineFehler : public std::exception {\n";
    std::cout << "       const char* what() const noexcept override {\n";
    std::cout << "           return \"Benutzerdefinierter Fehler\";\n";
    std::cout << "       }\n";
    std::cout << "   };\n";

    std::cout << "-> noexcept: Markiert Funktion als ausnahmefrei.\n";
    std::cout << "   Beispiel: void rechne() noexcept {}\n";
}


void HILFSBUCH::cpp_operatorueberladung() {
    std::cout << "\n=== Operatorüberladung in C++ ===\n";

    std::cout << "-> C++ erlaubt die Überladung vieler Operatoren für eigene Klassen\n";
    std::cout << "-> Ziel: Benutzung eigener Typen so intuitiv wie eingebaute Typen\n\n";

    std::cout << "=== Beispiel: Überladung von '+' ===\n";
    std::cout << "class Punkt {\n";
    std::cout << "public:\n";
    std::cout << "    int x, y;\n";
    std::cout << "    Punkt(int x, int y) : x(x), y(y) {}\n";
    std::cout << "    Punkt operator+(const Punkt& other) {\n";
    std::cout << "        return Punkt(x + other.x, y + other.y);\n";
    std::cout << "    }\n";
    std::cout << "};\n";
    std::cout << "-> Erlaubt z.B.: Punkt c = a + b;\n\n";

    std::cout << "=== Beispiel: Überladung von '==' ===\n";
    std::cout << "-> Vergleich von Objekten möglich\n";
    std::cout << "    bool operator==(const Punkt& other) const {\n";
    std::cout << "        return x == other.x && y == other.y;\n";
    std::cout << "    }\n";
    std::cout << "-> Erlaubt: if (a == b) { ... }\n";
    std::cout << "-> Wichtig: 'const' am Ende schützt das Objekt vor Veränderung\n\n";

    std::cout << "=== Beispiel: Überladung von '<<' für std::cout ===\n";
    std::cout << "-> Ermöglicht benutzerdefinierte Textausgabe\n";
    std::cout << "    friend std::ostream& operator<<(std::ostream& os, const Punkt& p) {\n";
    std::cout << "        return os << \"(\" << p.x << \", \" << p.y << \")\";\n";
    std::cout << "    }\n";
    std::cout << "-> Nutzung: std::cout << p;\n\n";

    std::cout << "=== Beispiel: Benutzerdefinierte Typ-Konvertierung ===\n";
    std::cout << "class Vector2D {\n";
    std::cout << "    double x_, y_;\n";
    std::cout << "public:\n";
    std::cout << "    Vector2D(double x, double y) : x_(x), y_(y) {}\n";
    std::cout << "    explicit operator double() const {\n";
    std::cout << "        return std::sqrt(x_ * x_ + y_ * y_);\n";
    std::cout << "    }\n";
    std::cout << "};\n";
    std::cout << "-> Wandelt ein Objekt in double um, z.B. über: double betrag = static_cast<double>(v);\n";
    std::cout << "-> 'explicit' verhindert automatische (implizite) Konvertierung\n";
    std::cout << "-> 'const' am Ende stellt sicher, dass kein Member verändert wird\n\n";

    std::cout << "=== Weitere Operatoren, die überladen werden können ===\n";
    std::cout << "-> []     // Zugriff auf Elemente wie bei Arrays\n";
    std::cout << "-> ()     // Funktionsaufruf-Operator\n";
    std::cout << "-> ->     // Memberzugriff bei Wrapper-Klassen\n";
    std::cout << "-> =      // Zuweisungsoperator (wenn nötig)\n";
    std::cout << "-> new / delete // Für benutzerdefinierte Speicherverwaltung\n\n";

    std::cout << "=== Hinweise zu const bei Operatoren ===\n";
    std::cout << "-> operator==, operator<, operator[] usw. sollten 'const' sein\n";
    std::cout << "-> bedeutet: dieser Operator verändert das Objekt nicht\n";
    std::cout << "-> z.B.: bool operator==(const T& other) const;\n\n";

    std::cout << "=== Wichtige Hinweise ===\n";
    std::cout << "-> Manche Operatoren dürfen NICHT überladen werden: ., ::, ?:, sizeof\n";
    std::cout << "-> Sinnvolle Überladung = besser lesbarer Code\n";
    std::cout << "-> Missbrauch = unleserlicher oder fehleranfälliger Code\n";

    int eingabe;
    std::cin >> eingabe;
}

void HILFSBUCH::cpp_funktionsueberladung() {
    std::cout << "\n=== Funktionsüberladung in C++ ===\n";

    std::cout << "-> In C++ können mehrere Funktionen mit gleichem Namen, aber unterschiedlicher Signatur existieren\n";
    std::cout << "-> Der Compiler entscheidet anhand der Argumente, welche Funktion verwendet wird\n";
    std::cout << "-> Das nennt man: Funktionsüberladung (function overloading)\n\n";

    std::cout << "=== Beispiel: Mehrere 'drucke'-Funktionen ===\n";
    std::cout << "void drucke(int wert) {\n";
    std::cout << "    std::cout << \"int: \" << wert << std::endl;\n";
    std::cout << "}\n\n";

    std::cout << "void drucke(double wert) {\n";
    std::cout << "    std::cout << \"double: \" << wert << std::endl;\n";
    std::cout << "}\n\n";

    std::cout << "void drucke(const std::string& text) {\n";
    std::cout << "    std::cout << \"string: \" << text << std::endl;\n";
    std::cout << "}\n\n";

    std::cout << "-> Aufruf entscheidet: drucke(42); // int-Version\n";
    std::cout << "-> drucke(3.14); // double-Version\n";
    std::cout << "-> drucke(\"Hallo\"); // string-Version\n\n";

    std::cout << "=== Überladung mit const und Referenz ===\n";
    std::cout << "void verarbeite(std::string& s);       // kann ändern\n";
    std::cout << "void verarbeite(const std::string& s); // nur lesen\n";
    std::cout << "-> Wird je nach constness des Arguments aufgerufen\n\n";

    std::cout << "=== Vorsicht: Mehrdeutigkeit ===\n";
    std::cout << "-> Der Compiler muss eindeutig entscheiden können\n";
    std::cout << "-> Beispiel: drucke(3); // könnte int oder float sein -> Achtung bei ähnlichen Typen\n\n";

    std::cout << "=== Überladung vs. Standardargumente ===\n";
    std::cout << "void beispiel(int x, int y = 0); // Default-Argument\n";
    std::cout << "void beispiel(int x);            // Überladung (Konflikt möglich!)\n";
    std::cout << "-> Nur eines von beidem verwenden – sonst Compilerfehler\n\n";

    std::cout << "=== Zusammenfassung ===\n";
    std::cout << "-> Funktionen können nach Anzahl, Typ oder const-Qualifikation unterschieden werden\n";
    std::cout << "-> Gute Überladung macht Code flexibler und lesbarer\n";
    std::cout << "-> Aber: klarer und eindeutiger Code ist wichtiger als Überladung um jeden Preis\n";

    int eingabe;
    std::cin >> eingabe;
}


void HILFSBUCH::cpp_friend() {
    std::cout << "\n=== friend in C++ ===\n";

    std::cout << "-> Mit dem Schlüsselwort 'friend' kann man gezielt Zugriff auf private Member gewähren\n";
    std::cout << "-> Es wird verwendet für: Funktionen, Operatoren, andere Klassen\n\n";

    std::cout << "=== Beispiel 1: friend-Funktion ===\n";
    std::cout << "class Punkt {\n";
    std::cout << "private:\n";
    std::cout << "    int x, y;\n";
    std::cout << "public:\n";
    std::cout << "    Punkt(int x, int y) : x(x), y(y) {}\n";
    std::cout << "    friend void zeigePunkt(const Punkt& p); // erlaubt Zugriff auf x und y\n";
    std::cout << "};\n\n";

    std::cout << "void zeigePunkt(const Punkt& p) {\n";
    std::cout << "    std::cout << \"Punkt: (\" << p.x << \", \" << p.y << \")\\n\";\n";
    std::cout << "}\n";
    std::cout << "-> Funktion 'zeigePunkt' kann auf private Member zugreifen\n\n";

    std::cout << "=== Beispiel 2: friend-Operator ===\n";
    std::cout << "class Punkt {\n";
    std::cout << "private:\n";
    std::cout << "    int x, y;\n";
    std::cout << "public:\n";
    std::cout << "    Punkt(int x, int y) : x(x), y(y) {}\n";
    std::cout << "    friend std::ostream& operator<<(std::ostream& os, const Punkt& p);\n";
    std::cout << "};\n\n";

    std::cout << "std::ostream& operator<<(std::ostream& os, const Punkt& p) {\n";
    std::cout << "    return os << \"(\" << p.x << \", \" << p.y << \")\";\n";
    std::cout << "}\n";
    std::cout << "-> Ermöglicht: std::cout << p;\n\n";

    std::cout << "=== Beispiel 3: friend-Klasse ===\n";
    std::cout << "class B;\n";
    std::cout << "class A {\n";
    std::cout << "private:\n";
    std::cout << "    int geheim = 42;\n";
    std::cout << "    friend class B; // Klasse B darf auf private Member von A zugreifen\n";
    std::cout << "};\n\n";

    std::cout << "class B {\n";
    std::cout << "public:\n";
    std::cout << "    void zeige(const A& a) {\n";
    std::cout << "        std::cout << \"B sieht: \" << a.geheim << std::endl;\n";
    std::cout << "    }\n";
    std::cout << "};\n\n";

    std::cout << "=== Wichtige Hinweise ===\n";
    std::cout << "-> 'friend' erlaubt gezielten Zugriff, ohne alles public zu machen\n";
    std::cout << "-> Bricht aber teilweise die Kapselung – daher sparsam einsetzen\n";
    std::cout << "-> 'friend' ist einseitig: Wenn A ein Freund von B ist, gilt das nicht automatisch umgekehrt\n";
    std::cout << "-> Auch einzelne Member-Funktionen können 'friend' sein\n";

    int eingabe;
    std::cin >> eingabe;
}

void HILFSBUCH::cpp_konstruktor() {
    std::cout << "\n=== Konstruktoren in C++ ===\n";

    std::cout << "-> Ein Konstruktor ist eine spezielle Funktion zum Erzeugen und Initialisieren eines Objekts\n";
    std::cout << "-> Er hat keinen Rückgabewert und denselben Namen wie die Klasse\n\n";

    std::cout << "=== Beispiel: Konstruktor mit Parametern ===\n";
    std::cout << "class Person {\n";
    std::cout << "private:\n";
    std::cout << "    std::string name;\n";
    std::cout << "    int alter;\n";
    std::cout << "public:\n";
    std::cout << "    Person(std::string n, int a) : name(n), alter(a) {}\n";
    std::cout << "    void vorstellen() {\n";
    std::cout << "        std::cout << \"Ich bin \" << name << \" und \" << alter << \" Jahre alt.\\n\";\n";
    std::cout << "    }\n";
    std::cout << "};\n\n";

    std::cout << "-> Konstruktor wird automatisch beim Erstellen des Objekts aufgerufen\n";
    std::cout << "Person p(\"Anna\", 30); // Konstruktor mit Argumenten\n";
    std::cout << "p.vorstellen();\n\n";

    std::cout << "=== Weitere Varianten ===\n";
    std::cout << "-> Default-Konstruktor (ohne Parameter)\n";
    std::cout << "-> Kopierkonstruktor (z.B. Person(const Person& other))\n";
    std::cout << "-> Move-Konstruktor (ab C++11)\n";

    int eingabe;
    std::cin >> eingabe;
}

void HILFSBUCH::cpp_vererbung() {
    std::cout << "\n=== Vererbung in C++ ===\n";

    std::cout << "-> Vererbung erlaubt es, Eigenschaften und Methoden einer Basisklasse in einer abgeleiteten Klasse wiederzuverwenden\n";
    std::cout << "-> Ziel: Code-Wiederverwendung und Modellierung von Spezialisierungen\n";
    std::cout << "-> Nur Klassen und structs können vererbt werden\n\n";

    std::cout << "=== Syntax: Basisklasse -> abgeleitete Klasse ===\n";
    std::cout << "class Tier {\n";
    std::cout << "public:\n";
    std::cout << "    void bewegen() {\n";
    std::cout << "        std::cout << \"Tier bewegt sich\\n\";\n";
    std::cout << "    }\n";
    std::cout << "};\n\n";

    std::cout << "class Hund : public Tier {\n";
    std::cout << "public:\n";
    std::cout << "    void bellen() {\n";
    std::cout << "        std::cout << \"Hund bellt\\n\";\n";
    std::cout << "    }\n";
    std::cout << "};\n\n";

    std::cout << "-> Hund erbt von Tier\n";
    std::cout << "-> Hund kann 'bewegen()' verwenden, auch wenn es nur in Tier definiert ist\n";
    std::cout << "-> Zugriff erfolgt über public-Vererbung: 'public Tier'\n\n";

    std::cout << "=== Objekt erstellen und nutzen ===\n";
    std::cout << "Hund h;\n";
    std::cout << "h.bewegen(); // aus Tier\n";
    std::cout << "h.bellen();  // aus Hund\n\n";

    std::cout << "=== Vererbungsarten ===\n";
    std::cout << "-> public    : öffentliche Member bleiben öffentlich\n";
    std::cout << "-> protected : öffentliche Member werden protected\n";
    std::cout << "-> private   : alles wird private in der abgeleiteten Klasse\n\n";

    std::cout << "=== Konstruktoren und Vererbung ===\n";
    std::cout << "-> Der Konstruktor der Basisklasse wird beim Erzeugen des Objekts automatisch aufgerufen\n";
    std::cout << "-> Oder man ruft ihn in der Initialisierungsliste auf\n\n";

    std::cout << "class Person {\n";
    std::cout << "public:\n";
    std::cout << "    Person(std::string name) {\n";
    std::cout << "        std::cout << \"Hallo \" << name << std::endl;\n";
    std::cout << "    }\n";
    std::cout << "};\n\n";

    std::cout << "class Student : public Person {\n";
    std::cout << "public:\n";
    std::cout << "    Student(std::string name) : Person(name) {}\n";
    std::cout << "};\n\n";

    std::cout << "=== Hinweise ===\n";
    std::cout << "-> Vererbung wird verwendet, wenn eine Klasse eine andere erweitern oder spezialisieren soll\n";
    std::cout << "-> Der Zugriff auf Basismethoden erfolgt wie gewohnt mit dem Punkt-Operator (objekt.methode())\n";
    std::cout << "-> protected Member sind in abgeleiteten Klassen sichtbar, aber nicht von außen erreichbar\n";

    int eingabe;
    std::cin >> eingabe;
}




















