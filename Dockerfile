FROM python:3

COPY requirements.txt ./
RUN pip install -r requirements.txt
RUN apt-get update -y
RUN apt-get install lua5.4 -y
RUN apt-get install luarocks -y
RUN luarocks install serpent
COPY . .
RUN chmod 777 runMe.sh
CMD [ "sh", "-c", "./runMe.sh"]
