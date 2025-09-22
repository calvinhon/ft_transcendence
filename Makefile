frontend:
	docker-compose up frontend-dev -d --build

clean:
	docker-compose down frontend-dev --rmi all

.PHONY: frontend