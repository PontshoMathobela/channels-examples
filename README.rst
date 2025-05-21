Channels Examples
=================

This is a repository of simple, well-commented django project site features in Django Channels. 

The Connect project (or app) was created based on an example called **Chat**, which is a real-time chat application built using Django Channels. This setup is supported by Daphne (an ASGI server) and Redis (used as a channel layer backend for message passing and event handling).

How to Run the Connect Project
=============================

1. **Clone the repository:**

   .. code-block:: bash

      git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
      cd channels-examples/multichat

2. **Create and activate a virtual environment:**

   .. code-block:: bash

      python -m venv venv
      .\venv\Scripts\activate   # On Windows
      # source venv/bin/activate   # On macOS/Linux

3. **Install dependencies:**

   .. code-block:: bash

      pip install -r requirements.txt

4. **Configure your database settings in `connect_settings.py` if needed.**

5. **Apply migrations:**

   .. code-block:: bash

      python manage.py makemigrations
      python manage.py migrate

6. **Make sure Redis server is running (default: 127.0.0.1:6379).**

7. **Run the development server:**

   .. code-block:: bash

      python manage.py runserver

8. **Open your browser and go to:**

   http://127.0.0.1:8000/