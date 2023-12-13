import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class SQLInjectionExample extends HttpServlet {
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException {
        try {
            Connection con = DriverManager.getConnection("jdbc:mysql://localhost:3306/db");

            String query = "SELECT * FROM users WHERE username = '" + request.getParameter("username") + "';";
            Statement stmt = con.createStatement();

            stmt.executeQuery(query);
        } catch (Exception e) {
            throw new ServletException(e);
        }
    }
}
