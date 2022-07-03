FROM python:3

COPY . .
RUN pip install -r requirements.txt
RUN apt-get update -y
RUN apt-get install lua5.4 -y
RUN apt-get install luarocks -y
RUN luarocks install serpent
RUN chmod 777 runMe.sh
CMD [ "sh", "-c", "./runMe.sh"]
