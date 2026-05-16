from neo4j import GraphDatabase

URI = "neo4j+s://3c5a8624.databases.neo4j.io"
AUTH = ("neo4j", "lpBFVEc7fLYMqqVoimENCpg0ryVE14uekqY0ULaa4b8")

class Neo4jService:
    def __init__(self):
        self.driver = GraphDatabase.driver(URI, auth=AUTH)
        
    def close(self):
        self.driver.close()
        
    def run_query(self, query, parameters=None):
        with self.driver.session() as session:
            result = session.run(query, parameters)
            return [record.data() for record in result]

neo4j_db = Neo4jService()
