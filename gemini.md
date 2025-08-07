# Project Brief: Interactive PoC Demo for Automotive B2B Client

## 1. Overall Objective

Create a functional, interactive Proof-of-Concept (PoC) web application. The demo will showcase Datanalisis.io's integrated capabilities by simulating a real-time lead capture and business intelligence cycle for a used car dealership. The core narrative is **"From Prospect to Analysis in Real-Time."**

---

## 2. Component 1: AI Lead Capture Chatbot

This component will simulate an intelligent agent on the client's website.

* **Interface:**
    * A single, simple webpage designed to look like a clean, modern car dealership's homepage.
    * A chatbot interface will pop up proactively after a few seconds.

* **Chatbot Conversation Flow (Script):**
    1.  **Greeting (Proactive):** "¡Hola! Bienvenido a [Nombre del Concesionario]. ¿Qué tipo de vehículo estás buscando hoy? (Ej: SUV, Sedán, Pickup)"
    2.  **First Qualification:** The user provides a vehicle type.
    3.  **Second Qualification:** The chatbot responds, "Excelente elección. ¿Tienes algún rango de precio en mente?"
    4.  **Lead Conversion:** The user provides a price range. The chatbot executes the final action: "Tenemos varias opciones excelentes que encajan con tu búsqueda. ¿Te gustaría que un asesor te contacte por WhatsApp para enviarte fotos y agendar una prueba de manejo? Solo necesito tu **nombre** y **número de teléfono**."

* **Backend Logic (Simulated with n8n/equivalent):**
    * When the user submits their name and phone number, the system must perform two actions:
        1.  Display a "Gracias, un asesor te contactará pronto" message in the chat.
        2.  Write the captured data (Name, Phone, Vehicle Type, Price Range, Timestamp) to a simple, accessible data store (e.g., a temporary database or a JSON file).

---

## 3. Component 2: Real-Time BI Dashboard

This component will display the business intelligence derived from the chatbot's interactions. It must be on the same webpage as the chatbot for maximum impact.

* **Interface:**
    * A section on the webpage titled "Panel de Control Gerencial (En Vivo)".
    * It must feature several distinct data visualization widgets.

* **Dashboard Widgets & KPIs:**
    1.  **KPI Card - "Prospectos Capturados Hoy":** A large number display. It starts at '0'.
    2.  **Bar Chart - "Vehículos Más Buscados":** A simple bar chart showing the count for each vehicle type queried via the chatbot (SUV, Sedán, etc.).
    3.  **Table - "Prospectos Recientes":** A table with columns for `Nombre`, `Teléfono`, `Vehículo de Interés`, y `Hora`.

* **Core Functionality (The "Wow" Moment):**
    * The dashboard **MUST** update automatically and in real-time upon the chatbot form submission.
    * When the user submits their info in the chatbot:
        * The "Prospectos Capturados Hoy" KPI must increment by 1.
        * The "Vehículos Más Buscados" chart must update to reflect the new data point.
        * A new row must instantly appear in the "Prospectos Recientes" table with the captured information.

---

## 4. Technology Stack

* **Frontend:** HTML, CSS, JavaScript. No complex frameworks are needed.
* **Backend/Automation:** n8n or a similar workflow automation tool to handle the chatbot logic.
* **Data Store:** A simple, temporary data store like a JSON file or a lightweight database that the frontend can poll or receive updates from.

## 5. Success Criteria

The demo is considered successful when a user can complete the entire chatbot flow, and the BI dashboard updates instantly to reflect the newly captured lead and metrics without requiring a page refresh.